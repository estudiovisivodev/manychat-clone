import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?ig_error=${error ?? 'no_code'}`)
  }

  try {
    const appId = process.env.FB_APP_ID!
    const appSecret = process.env.FB_APP_SECRET!
    const redirectUri = `${appUrl}/api/instagram/callback`

    // Exchange code for short-lived Facebook User Token
    const tokenUrl = new URL('https://graph.facebook.com/v22.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', appId)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('client_secret', appSecret)
    tokenUrl.searchParams.set('code', code)

    const tokenRes = await fetch(tokenUrl.toString())
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('[FB OAuth] token exchange failed:', tokenData)
      return NextResponse.redirect(`${appUrl}/settings?ig_error=token_exchange_failed`)
    }

    // Exchange for long-lived User Token (~60 days)
    const llUrl = new URL('https://graph.facebook.com/oauth/access_token')
    llUrl.searchParams.set('grant_type', 'fb_exchange_token')
    llUrl.searchParams.set('client_id', appId)
    llUrl.searchParams.set('client_secret', appSecret)
    llUrl.searchParams.set('fb_exchange_token', tokenData.access_token)

    const llRes = await fetch(llUrl.toString())
    const llData = await llRes.json()
    const longToken = llData.access_token ?? tokenData.access_token

    // Save long-lived user token
    await db.appSetting.upsert({
      where: { key: 'fb_user_access_token' },
      create: { key: 'fb_user_access_token', value: longToken },
      update: { value: longToken },
    })

    // Get Page Access Token for the Estúdio Visivo page
    const pagesRes = await fetch(
      `https://graph.facebook.com/v22.0/me/accounts?access_token=${longToken}`
    )
    const pagesData = await pagesRes.json()
    const page = (pagesData.data ?? []).find(
      (p: { id: string }) => p.id === '962368243633567'
    )

    if (page?.access_token) {
      await db.appSetting.upsert({
        where: { key: 'fb_page_access_token' },
        create: { key: 'fb_page_access_token', value: page.access_token },
        update: { value: page.access_token },
      })

      // Subscribe the Page to webhook events
      await fetch(
        `https://graph.facebook.com/v22.0/962368243633567/subscribed_apps`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            subscribed_fields: 'messages,messaging_postbacks,mention',
            access_token: page.access_token,
          }),
        }
      ).then(r => r.json()).then(d => console.log('[FB OAuth] page subscription:', d))
    }

    console.log('[FB OAuth] authorized successfully')
    return NextResponse.redirect(`${appUrl}/settings?ig_connected=true`)
  } catch (err) {
    console.error('[FB OAuth] error:', err)
    return NextResponse.redirect(`${appUrl}/settings?ig_error=server_error`)
  }
}
