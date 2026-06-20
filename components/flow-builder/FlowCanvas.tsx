'use client'
import { useCallback, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type NodeTypes,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { SendMessageNode } from './nodes/SendMessageNode'
import { WaitNode } from './nodes/WaitNode'
import { ConditionNode } from './nodes/ConditionNode'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'

const nodeTypes: NodeTypes = {
  send_message: SendMessageNode,
  wait: WaitNode,
  condition: ConditionNode,
}

const initialNodes = [
  {
    id: 'trigger',
    type: 'input',
    position: { x: 50, y: 200 },
    data: { label: '⚡ Gatilho' },
    style: {
      background: '#346DF1',
      color: 'white',
      borderRadius: 12,
      border: 'none',
      fontSize: 12,
      fontWeight: 600,
      padding: '10px 16px',
    },
  },
]

interface Props {
  flowId: string
  savedNodes?: any[]
  savedEdges?: any[]
}

export function FlowCanvas({ flowId, savedNodes, savedEdges }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(savedNodes ?? initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(savedEdges ?? [])
  const [saving, setSaving] = useState(false)

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  )

  function addNode(type: string) {
    const id = `node-${Date.now()}`
    setNodes((nds) => [
      ...nds,
      {
        id,
        type,
        position: { x: 200 + nds.length * 50, y: 150 + (nds.length % 3) * 80 },
        data: { text: '', duration: 1, unit: 'hora(s)', keyword: '' },
      },
    ])
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/flows/${flowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: nodes.map((n) => ({ ...n, edges: [] })) }),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Node panel */}
      <div className="w-52 border-r border-gray-100 bg-white p-4 flex flex-col gap-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Blocos</p>
        {[
          { type: 'send_message', label: '💬 Enviar Mensagem' },
          { type: 'wait', label: '⏱ Aguardar' },
          { type: 'condition', label: '🔀 Condição' },
        ].map(({ type, label }) => (
          <button
            key={type}
            onClick={() => addNode(type)}
            className="text-left text-xs px-3 py-2 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors text-gray-700"
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="bg-[#346DF1] hover:bg-blue-700 text-white w-full text-xs"
        >
          <Save className="w-3 h-3 mr-1.5" />
          {saving ? 'Salvando...' : 'Salvar Flow'}
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#e5e7eb" gap={20} />
          <Controls className="!bg-white !border-gray-200 !shadow-sm" />
          <MiniMap className="!bg-white !border-gray-100 !shadow-sm" />
        </ReactFlow>
      </div>
    </div>
  )
}
