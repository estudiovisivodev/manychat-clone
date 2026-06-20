'use client'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ShieldCheck } from 'lucide-react'

interface Props {
  enabled: boolean
  message: string
  onToggle: (enabled: boolean) => void
  onMessageChange: (msg: string) => void
}

export function FollowGateToggle({ enabled, message, onToggle, onMessageChange }: Props) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Follow Gate</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Exige que o usuário siga o perfil antes de receber o link
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          className="flex-shrink-0"
        />
      </div>

      {enabled && (
        <div className="mt-4">
          <Label className="text-xs text-gray-600 mb-1.5 block">
            Mensagem se não seguir
          </Label>
          <Textarea
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="Para receber o link, siga nosso perfil primeiro! 😊"
            rows={2}
            className="text-sm resize-none border-gray-200"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            O sistema verifica automaticamente via API se o usuário segue o perfil.
          </p>
        </div>
      )}
    </div>
  )
}
