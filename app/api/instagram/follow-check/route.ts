import { NextRequest, NextResponse } from 'next/server'
import { checkIsFollower } from '@/lib/follow-gate'

export async function POST(req: NextRequest) {
  const { igUserId } = await req.json()
  if (!igUserId) return NextResponse.json({ error: 'igUserId required' }, { status: 400 })

  const isFollower = await checkIsFollower(igUserId)
  return NextResponse.json({ igUserId, isFollower })
}
