import axios from 'axios'
import { db } from './db'

const BASE = 'https://graph.facebook.com/v22.0'
const IG_ID = process.env.INSTAGRAM_BUSINESS_ID!

async function getToken(): Promise<string> {
  try {
    const setting = await db.appSetting.findUnique({ where: { key: 'fb_page_access_token' } })
    if (setting?.value) return setting.value
  } catch {
    // DB unavailable — fall through to env var
  }
  return process.env.FB_PAGE_ACCESS_TOKEN!
}

async function fbGet(path: string, params: Record<string, string> = {}) {
  const token = await getToken()
  const url = `${BASE}${path}`
  const response = await axios.get(url, {
    params: { access_token: token, ...params },
  })
  return response.data
}

async function fbPost(path: string, body: Record<string, unknown> = {}) {
  const token = await getToken()
  const url = `${BASE}${path}`
  const response = await axios.post(url, body, {
    params: { access_token: token },
  })
  return response.data
}

export async function sendDM(recipientIgId: string, message: string) {
  try {
    await fbPost(`/${IG_ID}/messages`, {
      recipient: { id: recipientIgId },
      message: { text: message },
      messaging_type: 'RESPONSE',
    })
  } catch (err: unknown) {
    const data = (err as { response?: { data?: unknown } })?.response?.data
    console.error('[Facebook] sendDM failed:', JSON.stringify(data ?? err))
    throw err
  }
}

export async function sendDMWithButton(
  recipientIgId: string,
  message: string,
  buttonLabel: string,
  buttonUrl: string
) {
  // Instagram DMs don't support button templates — send URL inline in message text
  const text = `${message}\n\n${buttonLabel}: ${buttonUrl}`
  await fbPost(`/${IG_ID}/messages`, {
    recipient: { id: recipientIgId },
    message: { text },
    messaging_type: 'RESPONSE',
  })
}

export async function replyToComment(commentId: string, message: string) {
  await fbPost(`/${commentId}/replies`, { message })
}

export async function likeComment(commentId: string) {
  await fbPost(`/${commentId}/likes`, {})
}

export async function getRecentPosts(): Promise<Array<{ id: string; media_type: string; thumbnail_url?: string; timestamp: string }>> {
  const data = await fbGet(`/${IG_ID}/media`, {
    fields: 'id,media_type,thumbnail_url,timestamp',
    limit: '20',
  })
  return data.data ?? []
}

export { fbGet, fbPost }
