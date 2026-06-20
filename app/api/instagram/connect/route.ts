import { NextResponse } from 'next/server'

export async function GET() {
  const appId = process.env.FB_APP_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appId || !appUrl) {
    return NextResponse.json({ error: 'FB_APP_ID or NEXT_PUBLIC_APP_URL not configured' }, { status: 500 })
  }

  const url = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', `${appUrl}/api/instagram/callback`)
  url.searchParams.set('scope', 'instagram_manage_messages,instagram_manage_comments,instagram_basic,pages_show_list,pages_read_engagement')
  url.searchParams.set('response_type', 'code')

  return NextResponse.redirect(url.toString())
}
