'use client'
import { Handle, Position } from 'reactflow'

export function WaitNode({ data }: { data: { duration?: number; unit?: string } }) {
  return (
    <div className="bg-white rounded-xl border border-yellow-200 shadow-md w-48 p-3">
      <Handle type="target" position={Position.Left} className="!bg-yellow-400" />
      <div className="flex items-center gap-2">
        <span className="text-sm">⏱</span>
        <span className="text-xs font-semibold text-gray-700">
          Aguardar {data.duration ?? 1} {data.unit ?? 'hora(s)'}
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-yellow-400" />
    </div>
  )
}
