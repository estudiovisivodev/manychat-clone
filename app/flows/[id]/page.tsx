import { AppShell } from '@/components/layout/AppShell'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { FlowCanvas } from '@/components/flow-builder/FlowCanvas'

export default async function FlowBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const flow = await db.flow.findUnique({
    where: { id },
    include: { nodes: true },
  })
  if (!flow) notFound()

  return (
    <AppShell>
      <div className="border-b border-gray-100 px-8 py-3.5 bg-white flex items-center gap-3">
        <h1 className="text-sm font-semibold text-gray-900">{flow.name}</h1>
        <span className="text-xs text-gray-400">Flow Builder</span>
      </div>
      <FlowCanvas
        flowId={flow.id}
        savedNodes={flow.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position as any,
          data: n.data as any,
        }))}
      />
    </AppShell>
  )
}
