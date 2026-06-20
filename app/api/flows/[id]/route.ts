import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const flow = await db.flow.findUnique({
      where: { id },
      include: { nodes: true },
    })
    if (!flow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(flow)
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { nodes } = await req.json()
    // Replace all nodes for this flow
    await db.flowNode.deleteMany({ where: { flowId: id } })
    if (nodes?.length) {
      await db.flowNode.createMany({
        data: nodes.map((n: any) => ({
          flowId: id,
          type: n.type ?? 'send_message',
          position: n.position as any,
          data: n.data as any,
          edges: n.edges ?? [],
        })),
      })
    }
    const flow = await db.flow.findUnique({
      where: { id },
      include: { nodes: true },
    })
    return NextResponse.json(flow)
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
