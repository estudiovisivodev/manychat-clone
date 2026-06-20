'use client'
import { Handle, Position } from 'reactflow'

export function ConditionNode({ data }: { data: { keyword?: string } }) {
  return (
    <div className="bg-white rounded-xl border border-purple-200 shadow-md w-52 p-3">
      <Handle type="target" position={Position.Left} className="!bg-purple-400" />
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">🔀</span>
        <span className="text-xs font-semibold text-gray-700">Condição</span>
      </div>
      <p className="text-xs text-gray-500">
        Contém: <strong>{data.keyword || '...'}</strong>
      </p>
      <Handle type="source" position={Position.Right} id="yes" style={{ top: '30%' }} className="!bg-green-400" />
      <Handle type="source" position={Position.Right} id="no" style={{ top: '70%' }} className="!bg-red-400" />
    </div>
  )
}
