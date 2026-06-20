'use client'
import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'

interface Props {
  id: string
  name: string
  type: string
  status: string
  eventCount: number
  onDelete: (id: string) => void
  onToggle: (id: string, newStatus: string) => void
}

const typeLabels: Record<string, string> = {
  comment_to_dm: 'Comentário → DM',
  story_reply: 'Resposta em Story',
  dm_keyword: 'Palavra-chave DM',
  story_reaction: 'Reação em Story',
  story_mention: 'Menção em Story',
}

export function AutomationCard({ id, name, type, status, eventCount, onDelete, onToggle }: Props) {
  const [loading, setLoading] = useState(false)
  const isLive = status === 'live'

  async function handleToggle(checked: boolean) {
    setLoading(true)
    await fetch(`/api/automations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: checked ? 'live' : 'paused' }),
    })
    onToggle(id, checked ? 'live' : 'paused')
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
          <span className="text-[#346DF1] text-sm font-bold">{name[0]}</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{name}</span>
            {isLive && (
              <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0 rounded-full border-0">
                LIVE
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{typeLabels[type]} · {eventCount} eventos</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={isLive}
          onCheckedChange={handleToggle}
          disabled={loading}
          className="data-[state=checked]:bg-[#346DF1]"
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            className="w-8 h-8 rounded-lg hover:bg-gray-50 flex items-center justify-center text-gray-400"
          >
            <MoreHorizontal className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem className="flex items-center gap-2 p-0">
              <Link
                href={`/automations/${id}/edit`}
                className="flex items-center gap-2 w-full px-1.5 py-1"
              >
                <Pencil className="w-3.5 h-3.5" /> Editar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 flex items-center gap-2"
              onClick={() => onDelete(id)}
            >
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
