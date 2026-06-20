import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CreateAutomationSchema } from '@/lib/validators'

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const automation = await db.automation.findUnique({
    where: { id },
    include: { events: { orderBy: { createdAt: 'desc' }, take: 50 } },
  })
  if (!automation) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(automation)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const parsed = CreateAutomationSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const automation = await db.automation.update({
    where: { id },
    data: {
      ...(parsed.data.name && { name: parsed.data.name }),
      ...(parsed.data.triggerRule && { triggerRule: parsed.data.triggerRule as any }),
      ...(parsed.data.flowId !== undefined && { flowId: parsed.data.flowId }),
    },
  })
  return NextResponse.json(automation)
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await db.automation.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

// Toggle live/paused/draft
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { status } = await req.json()
  if (!['live', 'paused', 'draft'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  const automation = await db.automation.update({
    where: { id },
    data: { status },
  })
  return NextResponse.json(automation)
}
