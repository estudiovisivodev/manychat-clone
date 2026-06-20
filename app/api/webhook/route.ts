import type { NextRequest } from 'next/server'
import { webhookQueue } from '@/lib/queue'
import type { WebhookEntry } from '@/types'

const VERIFY_TOKEN = process.env.FB_WEBHOOK_VERIFY_TOKEN!

// Facebook webhook verification
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}

// Facebook event receiver
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ status: 'bad_request' }, { status: 400 })
  }

  if (body.object !== 'instagram' && body.object !== 'page') {
    return Response.json({ status: 'ignored' })
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
        try {
          await webhookQueue.add('comment', webhookEntry)
        } catch (err) {
          console.error('Failed to queue comment event:', err)
        }
      }
    }

    // DM messaging
    const messaging = Array.isArray(entry.messaging) ? entry.messaging : []
    for (const msg of messaging) {
      if (msg.message) {
        const webhookEntry: WebhookEntry = {
          kind: 'dm',
          data: {
            sender: msg.sender,
            recipient: msg.recipient,
            timestamp: msg.timestamp,
            message: msg.message,
          },
        }
        try {
          await webhookQueue.add('dm', webhookEntry)
        } catch (err) {
          console.error('Failed to queue DM event:', err)
        }
      }

      // Story replies / reactions
      if (msg.reaction || msg.referral) {
        const storyEntry: WebhookEntry = {
          kind: 'story',
          data: {
            type: msg.reaction ? 'story_reaction' : 'story_reply',
            from: msg.sender,
            media: { id: msg.referral?.ref ?? '' },
            replyText: msg.message?.text,
            reaction: msg.reaction?.emoji,
          },
        }
        try {
          await webhookQueue.add('story', storyEntry)
        } catch (err) {
          console.error('Failed to queue story event:', err)
        }
      }
    }
  }

  // Always return 200 — Facebook requires this even if processing fails
  return Response.json({ status: 'ok' })
}
