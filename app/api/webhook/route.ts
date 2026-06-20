import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import type { WebhookEntry } from '@/types'

async function verifySignature(req: NextRequest, body: string): Promise<boolean> {
  const signature = req.headers.get('x-hub-signature-256') ?? ''
  if (!signature) return true // no signature header — dev/test mode
  // Accept if either the main FB app secret or the Instagram app secret matches
  const secrets = [process.env.FB_APP_SECRET, process.env.IG_APP_SECRET].filter(Boolean) as string[]
  if (secrets.length === 0) return true
  return secrets.some(secret => {
    const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
    return signature === expected
  })
}

// FIX 10: warn on missing VERIFY_TOKEN
if (!process.env.FB_WEBHOOK_VERIFY_TOKEN) {
  console.warn('[Webhook] FB_WEBHOOK_VERIFY_TOKEN is not set — all GET verification requests will return 403')
}
const VERIFY_TOKEN = process.env.FB_WEBHOOK_VERIFY_TOKEN ?? ''

// Import automation engine at module level so it's ready immediately
import { processWebhookJob } from '@/lib/automation-engine'

// Facebook webhook verification
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // FIX 3: guard against null challenge
  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Facebook event receiver
export async function POST(req: NextRequest) {
  // FIX 2: wrap entire POST body in try/catch — always return 200
  try {
    const rawBody = await req.text()
    if (!(await verifySignature(req, rawBody))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    const body = JSON.parse(rawBody)

    // Diagnostic log — shows exactly what Meta is sending
    console.log('[Webhook] received object:', body.object, '| raw:', rawBody.slice(0, 600))

    if (body.object !== 'instagram' && body.object !== 'page') {
      console.log('[Webhook] ignored — unknown object:', body.object)
      return NextResponse.json({ status: 'ignored' })
    }

    const entries = Array.isArray(body.entry) ? body.entry : []
    const toProcess: WebhookEntry[] = []

    for (const entry of entries) {
      // Comments on media
      const changes = Array.isArray(entry.changes) ? entry.changes : []
      for (const change of changes) {
        console.log('[Webhook] change field:', change.field, '| value:', JSON.stringify(change.value).slice(0, 300))
        if (change.field === 'comments') {
          const val = change.value
          toProcess.push({
            kind: 'comment',
            data: {
              id: val.id,
              text: val.text,
              from: { id: val.from?.id, username: val.from?.username },
              media: { id: val.media?.id },
              timestamp: val.timestamp,
            },
          })
        } else if (change.field === 'feed' && change.value?.item === 'comment') {
          // Instagram comments sometimes arrive via page/feed — handle both formats
          const val = change.value
          toProcess.push({
            kind: 'comment',
            data: {
              id: val.comment_id ?? val.id,
              text: val.message ?? val.text ?? '',
              from: { id: val.from?.id, username: val.from?.name },
              media: { id: val.post_id ?? val.media?.id ?? '' },
              timestamp: val.created_time ?? Date.now() / 1000,
            },
          })
        }
      }

      for (const messaging of entry.messaging ?? []) {
        if (messaging.message && !messaging.referral) {
          toProcess.push({
            kind: 'dm',
            data: {
              sender: messaging.sender,
              recipient: messaging.recipient,
              timestamp: messaging.timestamp,
              message: messaging.message,
            },
          })
        } else if (messaging.message && messaging.referral) {
          toProcess.push({
            kind: 'story',
            data: {
              type: 'story_reply',
              from: messaging.sender,
              media: { id: messaging.referral.ref ?? '' },
              replyText: messaging.message?.text,
            },
          })
        } else if (messaging.reaction) {
          toProcess.push({
            kind: 'story',
            data: {
              type: 'story_reaction',
              from: messaging.sender,
              media: { id: '' },
              reaction: messaging.reaction.emoji,
            },
          })
        } else if (messaging.mention) {
          toProcess.push({
            kind: 'story',
            data: {
              type: 'story_mention',
              from: messaging.sender,
              media: { id: messaging.mention?.media?.id ?? '' },
            },
          })
        }
      }
    }

    // Process synchronously BEFORE returning 200 — Vercel kills fire-and-forget
    // before async DB calls complete. Facebook allows up to 5s; our processing ~1-2s.
    await Promise.all(
      toProcess.map(entry =>
        processWebhookJob(entry).catch(err => console.error('[Webhook] processing error:', err))
      )
    )

    return NextResponse.json({ status: 'ok' })
  } catch {
    // FIX 2: always return 200 — Facebook requires this even if processing fails
    return NextResponse.json({ status: 'ok' })
  }
}
