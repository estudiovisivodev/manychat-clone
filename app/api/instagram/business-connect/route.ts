import { NextResponse } from 'next/server'

export async function GET() {
  const appId = process.env.FB_APP_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appId || !appUrl) {
    return NextResponse.json({ error: 'FB_APP_ID or NEXT_PUBLIC_APP_URL not configured' }, { status: 500 })
  }

  const url = new URL('https://api.instagram.com/oauth/authorize')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', `${appUrl}/api/instagram/business-callback`)
  url.searchParams.set('scope', 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments')
  url.searchParams.set('response_type', 'code')

  return NextResponse.redirect(url.toString())
}
