import { NextResponse } from 'next/server'
import { getRecentPosts } from '@/lib/facebook'

export async function GET() {
  try {
    const posts = await getRecentPosts()
    return NextResponse.json(posts)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
