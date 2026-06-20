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
    // Exchange code for short-lived Instagram User Access Token
    const form = new URLSearchParams({
      client_id: process.env.FB_APP_ID!,
      client_secret: process.env.FB_APP_SECRET!,
      grant_type: 'authorization_code',
      redirect_uri: `${appUrl}/api/instagram/callback`,
      code,
    })

    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: form,
    })
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('[Instagram OAuth] token exchange failed:', tokenData)
      return NextResponse.redirect(`${appUrl}/settings?ig_error=token_exchange_failed`)
    }

    // Exchange short-lived token for long-lived token (~60 days)
    const llRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.FB_APP_SECRET}&access_token=${tokenData.access_token}`
    )
    const llData = await llRes.json()
    const longToken = llData.access_token ?? tokenData.access_token

    // Persist the token so the app can use it for DMs
    await db.appSetting.upsert({
      where: { key: 'ig_user_access_token' },
      create: { key: 'ig_user_access_token', value: longToken },
      update: { value: longToken },
    })
    await db.appSetting.upsert({
      where: { key: 'ig_user_id' },
      create: { key: 'ig_user_id', value: String(tokenData.user_id) },
      update: { value: String(tokenData.user_id) },
    })

    console.log('[Instagram OAuth] authorized user_id:', tokenData.user_id)
    return NextResponse.redirect(`${appUrl}/settings?ig_connected=true`)
  } catch (err) {
    console.error('[Instagram OAuth] error:', err)
    return NextResponse.redirect(`${appUrl}/settings?ig_error=server_error`)
  }
}
