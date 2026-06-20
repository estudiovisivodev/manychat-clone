import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CreateAutomationSchema } from '@/lib/validators'

export async function GET() {
  const automations = await db.automation.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { events: true } } },
  })
  return NextResponse.json(automations)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = CreateAutomationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const automation = await db.automation.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      triggerRule: parsed.data.triggerRule as any,
      flowId: parsed.data.flowId,
    },
  })

  return NextResponse.json(automation, { status: 201 })
}
