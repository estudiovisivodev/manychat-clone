import axios from 'axios'
import { db } from './db'

const BASE = 'https://graph.facebook.com/v25.0'
const IG_BASE = 'https://graph.instagram.com/v21.0'
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

async function getUserToken(): Promise<string> {
  try {
    const setting = await db.appSetting.findUnique({ where: { key: 'fb_user_access_token' } })
    if (setting?.value) return setting.value
  } catch {
    // fall through
  }
  return process.env.FB_PAGE_ACCESS_TOKEN!
}

async function getIgBusinessToken(): Promise<string | null> {
  try {
    const setting = await db.appSetting.findUnique({ where: { key: 'ig_business_access_token' } })
    if (setting?.value) return setting.value
  } catch {
    // fall through
  }
  return process.env.IG_BUSINESS_ACCESS_TOKEN ?? null
}

async function getIgBusinessId(): Promise<string> {
  try {
    const setting = await db.appSetting.findUnique({ where: { key: 'ig_business_user_id' } })
    if (setting?.value) return setting.value
  } catch {
    // fall through
  }
  return IG_ID
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

async function igPost(path: string, body: Record<string, unknown> = {}) {
  const token = await getIgBusinessToken()
  if (!token) throw new Error('IG_BUSINESS_ACCESS_TOKEN not configured')
  const igUserId = await getIgBusinessId()
  const url = `${IG_BASE}/${igUserId}${path}`
  const response = await axios.post(url, body, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

// Private Reply via comment_id — new Instagram Business API on graph.instagram.com
export async function sendPrivateReply(commentId: string, message: string) {
  try {
    await igPost('/messages', {
      recipient: { comment_id: commentId },
      message: { text: message },
    })
  } catch (err: unknown) {
    const data = (err as { response?: { data?: unknown } })?.response?.data
    console.error('[Facebook] sendPrivateReply failed:', JSON.stringify(data ?? err))
    throw err
  }
}

export async function sendDM(recipientIgId: string, message: string) {
  try {
    await igPost('/messages', {
      recipient: { id: recipientIgId },
      message: { text: message },
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
  const text = `${message}\n\n${buttonLabel}: ${buttonUrl}`
  await igPost('/messages', {
    recipient: { id: recipientIgId },
    message: { text },
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
