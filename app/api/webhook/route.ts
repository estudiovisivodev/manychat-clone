import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import type { WebhookEntry } from '@/types'

async function verifySignature(req: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.FB_APP_SECRET
  if (!secret) return true // skip verification if secret not configured (dev mode)
  const signature = req.headers.get('x-hub-signature-256') ?? ''
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
  return signature === expected
}

// FIX 10: warn on missing VERIFY_TOKEN
if (!process.env.FB_WEBHOOK_VERIFY_TOKEN) {
  console.warn('[Webhook] FB_WEBHOOK_VERIFY_TOKEN is not set — all GET verification requests will return 403')
}
const VERIFY_TOKEN = process.env.FB_WEBHOOK_VERIFY_TOKEN ?? ''

// Process webhook entry directly — bypasses BullMQ so it works on Vercel serverless
function processAsync(entry: WebhookEntry) {
  import('@/lib/automation-engine')
    .then(({ processWebhookJob }) => processWebhookJob(entry))
    .catch((err) => console.error('[Webhook] processing error:', err))
}

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

    if (body.object !== 'instagram' && body.object !== 'page') {
      return NextResponse.json({ status: 'ignored' })
    }

    const entries = Array.isArray(body.entry) ? body.entry : []

    for (const entry of entries) {
      // Comments on media
      const changes = Array.isArray(entry.changes) ? entry.changes : []
      for (const change of changes) {
        if (change.field === 'comments') {
          const val = change.value
          const webhookEntry: WebhookEntry = {
            kind: 'comment',
            data: {
              id: val.id,
              text: val.text,
              from: { id: val.from?.id, username: val.from?.username },
              media: { id: val.media?.id },
              timestamp: val.timestamp,
            },
          }
          processAsync(webhookEntry)
        }
      }

      // FIX 4: DM+referral double-fire — use mutually exclusive else-if branches
      for (const messaging of entry.messaging ?? []) {
        if (messaging.message && !messaging.referral) {
          // Pure DM — queue as 'dm'
          const webhookEntry: WebhookEntry = {
            kind: 'dm',
            data: {
              sender: messaging.sender,
              recipient: messaging.recipient,
              timestamp: messaging.timestamp,
              message: messaging.message,
            },
          }
          processAsync(webhookEntry)
        } else if (messaging.message && messaging.referral) {
          // Click-to-DM ad — queue as story_reply only (no double-fire)
          const storyEntry: WebhookEntry = {
            kind: 'story',
            data: {
              type: 'story_reply',
              from: messaging.sender,
              media: { id: messaging.referral.ref ?? '' },
              replyText: messaging.message?.text,
            },
          }
          processAsync(storyEntry)
        } else if (messaging.reaction) {
          const storyEntry: WebhookEntry = {
            kind: 'story',
            data: {
              type: 'story_reaction',
              from: messaging.sender,
              media: { id: '' },
              reaction: messaging.reaction.emoji,
            },
          }
          processAsync(storyEntry)
        } else if (messaging.mention) {
          // FIX 6: handle story_mention
          const storyEntry: WebhookEntry = {
            kind: 'story',
            data: {
              type: 'story_mention',
              from: messaging.sender,
              media: { id: messaging.mention?.media?.id ?? '' },
            },
          }
          processAsync(storyEntry)
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch {
    // FIX 2: always return 200 — Facebook requires this even if processing fails
    return NextResponse.json({ status: 'ok' })
  }
}
