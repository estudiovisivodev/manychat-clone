import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const appId = process.env.FB_APP_ID!
  const appSecret = process.env.FB_APP_SECRET!
  const igId = process.env.INSTAGRAM_BUSINESS_ID!

  // Load tokens from DB
  const [pageTokenRow, userTokenRow] = await Promise.all([
    db.appSetting.findUnique({ where: { key: 'fb_page_access_token' } }),
    db.appSetting.findUnique({ where: { key: 'fb_user_access_token' } }),
  ])

  const pageToken = pageTokenRow?.value ?? process.env.FB_PAGE_ACCESS_TOKEN ?? ''
  const userToken = userTokenRow?.value ?? ''

  async function debugToken(token: string, label: string) {
    if (!token) return { label, error: 'token not found' }
    try {
      const res = await fetch(
        `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`
      )
      return { label, ...(await res.json()) }
    } catch (e) {
      return { label, error: String(e) }
    }
  }

  async function testMessagesEndpoint(token: string, label: string) {
    // Dry-run: try to send to a fake comment_id to see the exact error
    try {
      const res = await fetch(
        `https://graph.facebook.com/v25.0/${igId}/messages?access_token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { comment_id: 'TEST_COMMENT_ID_DIAGNOSTIC' },
            message: { text: 'test' },
          }),
        }
      )
      const data = await res.json()
      return { label, status: res.status, response: data }
    } catch (e) {
      return { label, error: String(e) }
    }
  }

  async function checkIgAccount() {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v25.0/${igId}?fields=id,name,username,account_type,biography&access_token=${pageToken}`
      )
      return await res.json()
    } catch (e) {
      return { error: String(e) }
    }
  }

  const [pageDebug, userDebug, pageMessagesTest, igAccount] = await Promise.all([
    debugToken(pageToken, 'fb_page_access_token'),
    debugToken(userToken, 'fb_user_access_token'),
    testMessagesEndpoint(pageToken, 'messages_with_page_token'),
    checkIgAccount(),
  ])

  return NextResponse.json({
    igId,
    igAccount,
    tokens: {
      pageToken: pageDebug,
      userToken: userDebug,
    },
    messagesEndpointTest: pageMessagesTest,
  }, { status: 200 })
}
