import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CreateFlowSchema } from '@/lib/validators'

export async function GET() {
  try {
    const flows = await db.flow.findMany({ orderBy: { updatedAt: 'desc' } })
    return NextResponse.json(flows)
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = CreateFlowSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const flow = await db.flow.create({ data: { name: parsed.data.name } })
    return NextResponse.json(flow, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
