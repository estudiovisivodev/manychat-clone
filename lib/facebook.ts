import axios from 'axios'

const BASE = 'https://graph.facebook.com/v19.0'
const TOKEN = process.env.FB_PAGE_ACCESS_TOKEN!
const IG_ID = process.env.INSTAGRAM_BUSINESS_ID!

async function fbGet(path: string, params: Record<string, string> = {}) {
  const url = `${BASE}${path}`
  const response = await axios.get(url, {
    params: { access_token: TOKEN, ...params },
  })
  return response.data
}

async function fbPost(path: string, body: Record<string, unknown> = {}) {
  const url = `${BASE}${path}`
  const response = await axios.post(url, body, {
    params: { access_token: TOKEN },
  })
  return response.data
}

export async function sendDM(recipientIgId: string, message: string) {
  await fbPost(`/${IG_ID}/messages`, {
    recipient: { id: recipientIgId },
    message: { text: message },
    messaging_type: 'RESPONSE',
  })
}

export async function sendDMWithButton(
  recipientIgId: string,
  message: string,
  buttonLabel: string,
  buttonUrl: string
) {
  await fbPost(`/${IG_ID}/messages`, {
    recipient: { id: recipientIgId },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: message,
          buttons: [{ type: 'web_url', url: buttonUrl, title: buttonLabel }],
        },
      },
    },
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
