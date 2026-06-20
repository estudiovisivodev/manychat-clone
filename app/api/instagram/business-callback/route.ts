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
    const redirectUri = `${appUrl}/api/instagram/business-callback`

    // Exchange code for short-lived Instagram User Token
    const body = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    })

    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('[IG Business OAuth] token exchange failed:', tokenData)
      return NextResponse.redirect(`${appUrl}/settings?ig_error=token_exchange_failed`)
    }

    // Exchange for long-lived token (~60 days)
    const llUrl = new URL('https://graph.instagram.com/access_token')
    llUrl.searchParams.set('grant_type', 'ig_exchange_token')
    llUrl.searchParams.set('client_id', appId)
    llUrl.searchParams.set('client_secret', appSecret)
    llUrl.searchParams.set('access_token', tokenData.access_token)

    const llRes = await fetch(llUrl.toString())
    const llData = await llRes.json()
    const longToken = llData.access_token ?? tokenData.access_token

    // Save Instagram Business token
    await db.appSetting.upsert({
      where: { key: 'ig_business_access_token' },
      create: { key: 'ig_business_access_token', value: longToken },
      update: { value: longToken },
    })

    // Also save the Instagram user ID if returned
    if (tokenData.user_id) {
      await db.appSetting.upsert({
        where: { key: 'ig_business_user_id' },
        create: { key: 'ig_business_user_id', value: String(tokenData.user_id) },
        update: { value: String(tokenData.user_id) },
      })
    }

    console.log('[IG Business OAuth] authorized successfully, user_id:', tokenData.user_id)
    return NextResponse.redirect(`${appUrl}/settings?ig_business_connected=true`)
  } catch (err) {
    console.error('[IG Business OAuth] error:', err)
    return NextResponse.redirect(`${appUrl}/settings?ig_error=server_error`)
  }
}
