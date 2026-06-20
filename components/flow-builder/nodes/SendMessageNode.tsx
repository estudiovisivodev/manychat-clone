'use client'
import { Handle, Position } from 'reactflow'

export function SendMessageNode({ data }: { data: { text?: string } }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-md w-56 p-4">
      <Handle type="target" position={Position.Left} className="!bg-[#346DF1]" />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center text-xs">💬</div>
        <span className="text-xs font-semibold text-gray-700">Enviar Mensagem</span>
      </div>
      <p className="text-xs text-gray-500 truncate">{data.text || 'Clique para editar...'}</p>
      <Handle type="source" position={Position.Right} className="!bg-[#346DF1]" />
    </div>
  )
}
