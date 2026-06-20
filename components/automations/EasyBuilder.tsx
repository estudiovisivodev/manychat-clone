'use client'
import { useState } from 'react'
import { PhonePreview } from './PhonePreview'
import { FollowGateToggle } from './FollowGateToggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'
import type { TriggerRule } from '@/types'

interface Post {
  id: string
  media_type: string
  timestamp: string
}

interface Props {
  automationId?: string
  initialRule?: Partial<TriggerRule>
  initialName?: string
  posts: Post[]
  onSave: (name: string, rule: TriggerRule) => Promise<void>
  onGoLive: (name: string, rule: TriggerRule) => Promise<void>
  isSaving: boolean
}

export function EasyBuilder({
  initialRule,
  initialName = '',
  posts,
  onSave,
  onGoLive,
  isSaving,
}: Props) {
  const [name, setName] = useState(initialName)
  const [rule, setRule] = useState<Partial<TriggerRule>>(
    initialRule ?? {
      keywords: [],
      keywordMatchType: 'any',
      replyToComment: false,
      commentReplies: [''],
      openingDm: '',
      followGateEnabled: false,
      followGateDm: 'Para receber o link, siga nosso perfil primeiro! 😊',
      followUpDm: '',
    }
  )
  const [previewTab, setPreviewTab] = useState<'post' | 'comments' | 'dm'>('dm')
  const [kwInput, setKwInput] = useState('')

  function update(patch: Partial<TriggerRule>) {
    setRule((prev) => ({ ...prev, ...patch }))
  }

  function addKeyword() {
    const trimmed = kwInput.trim()
    if (!trimmed) return
    update({ keywords: [...(rule.keywords ?? []), trimmed.toLowerCase()] })
    setKwInput('')
  }

  function removeKeyword(kw: string) {
    update({ keywords: rule.keywords?.filter((k) => k !== kw) ?? [] })
  }

  function buildFullRule(): TriggerRule {
    return {
      postId: rule.postId,
      keywords: rule.keywords ?? [],
      keywordMatchType: rule.keywordMatchType ?? 'any',
      replyToComment: rule.replyToComment ?? false,
      commentReplies: rule.commentReplies?.filter(Boolean) ?? [],
      openingDm: rule.openingDm ?? '',
      followGateEnabled: rule.followGateEnabled ?? false,
      followGateDm: rule.followGateDm ?? '',
      linkButton: rule.linkButton,
      followUpDm: rule.followUpDm ?? '',
    }
  }

  async function handleSave() {
    await onSave(name, buildFullRule())
  }

  async function handleGoLive() {
    await onGoLive(name, buildFullRule())
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Config column */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 border-r border-gray-100">
        {/* Name */}
        <div>
          <Label className="text-xs text-gray-600 mb-1 block">Nome da Automação</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Automação Ebook"
            className="text-sm border-gray-200"
          />
        </div>

        {/* Step 1: Post selector */}
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-900 mb-3">1. Qual post ou reel?</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!rule.postId}
                onChange={() => update({ postId: undefined })}
                className="accent-[#346DF1]"
              />
              <span className="text-sm text-gray-700">Qualquer post ou reel</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!!rule.postId}
                onChange={() => update({ postId: posts[0]?.id })}
                className="accent-[#346DF1]"
              />
              <span className="text-sm text-gray-700">Post ou reel específico</span>
            </label>
          </div>
          {rule.postId && posts.length > 0 && (
            <select
              className="mt-3 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#346DF1] bg-white"
              value={rule.postId}
              onChange={(e) => update({ postId: e.target.value })}
            >
              {posts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.media_type} — {new Date(p.timestamp).toLocaleDateString('pt-BR')}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Step 2: Keywords */}
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-900 mb-3">2. Palavra-chave do comentário</p>
          <div className="space-y-2 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={(rule.keywords ?? []).length === 0}
                onChange={() => update({ keywords: [] })}
                className="accent-[#346DF1]"
              />
              <span className="text-sm text-gray-700">Qualquer comentário</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={(rule.keywords ?? []).length > 0}
                onChange={() => {
                  if ((rule.keywords ?? []).length === 0) {
                    update({ keywords: ['link'] })
                  }
                }}
                className="accent-[#346DF1]"
              />
              <span className="text-sm text-gray-700">Palavra específica</span>
            </label>
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={kwInput}
                onChange={(e) => setKwInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addKeyword()
                  }
                }}
                placeholder="Ex: link, ebook, quero..."
                className="text-sm border-gray-200 flex-1"
              />
              <Button size="sm" variant="outline" onClick={addKeyword} type="button">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {(rule.keywords ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(rule.keywords ?? []).map((kw) => (
                  <Badge key={kw} variant="secondary" className="text-xs gap-1 pr-1">
                    {kw}
                    <button
                      type="button"
                      onClick={() => removeKeyword(kw)}
                      className="ml-0.5 hover:text-red-500"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Comment reply */}
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-900">3. Responder comentário</p>
            <Switch
              checked={rule.replyToComment ?? false}
              onCheckedChange={(v) => update({ replyToComment: v })}
            />
          </div>
          {rule.replyToComment && (
            <div className="space-y-2">
              {(rule.commentReplies ?? ['']).map((reply, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={reply}
                    onChange={(e) => {
                      const replies = [...(rule.commentReplies ?? [''])]
                      replies[i] = e.target.value
                      update({ commentReplies: replies })
                    }}
                    placeholder="Ex: Acabei de te mandar no DM! 😊"
                    className="text-sm border-gray-200"
                  />
                  {(rule.commentReplies?.length ?? 0) > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        update({
                          commentReplies: rule.commentReplies?.filter((_, j) => j !== i),
                        })
                      }
                      className="text-gray-400 hover:text-red-500 flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  update({ commentReplies: [...(rule.commentReplies ?? ['']), ''] })
                }
                className="text-xs text-[#346DF1] hover:underline"
              >
                + Adicionar variação
              </button>
            </div>
          )}
        </div>

        {/* Step 4: Opening DM */}
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-900 mb-2">4. Mensagem inicial no DM</p>
          <Textarea
            value={rule.openingDm ?? ''}
            onChange={(e) => update({ openingDm: e.target.value })}
            placeholder="Oi! Vi seu comentário. Aqui está o que você pediu..."
            rows={3}
            className="text-sm resize-none border-gray-200"
          />
        </div>

        {/* Step 5: Follow Gate */}
        <div>
          <p className="text-sm font-medium text-gray-900 mb-2 px-0">5. Follow Gate</p>
          <FollowGateToggle
            enabled={rule.followGateEnabled ?? false}
            message={rule.followGateDm ?? ''}
            onToggle={(v) => update({ followGateEnabled: v })}
            onMessageChange={(msg) => update({ followGateDm: msg })}
          />
        </div>

        {/* Step 6: Link button */}
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-900">6. Botão com link</p>
            <Switch
              checked={!!rule.linkButton}
              onCheckedChange={(v) =>
                update({
                  linkButton: v ? { label: 'Acessar link', url: 'https://' } : undefined,
                })
              }
            />
          </div>
          {rule.linkButton && (
            <div className="space-y-2">
              <Input
                value={rule.linkButton.label}
                onChange={(e) =>
                  update({ linkButton: { ...rule.linkButton!, label: e.target.value } })
                }
                placeholder="Texto do botão"
                className="text-sm border-gray-200"
              />
              <Input
                value={rule.linkButton.url}
                onChange={(e) =>
                  update({ linkButton: { ...rule.linkButton!, url: e.target.value } })
                }
                placeholder="https://..."
                className="text-sm border-gray-200"
              />
            </div>
          )}
        </div>

        {/* Step 7: Follow-up DM */}
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-900 mb-2">7. DM de follow-up (opcional)</p>
          <Textarea
            value={rule.followUpDm ?? ''}
            onChange={(e) => update({ followUpDm: e.target.value })}
            placeholder="Conseguiu acessar? Qualquer dúvida estou aqui! 😊"
            rows={2}
            className="text-sm resize-none border-gray-200"
          />
        </div>

        {/* Save actions */}
        <div className="flex gap-3 pt-2 pb-8">
          <Button
            onClick={handleSave}
            disabled={isSaving || !name}
            variant="outline"
            className="flex-1 text-sm border-gray-200"
            type="button"
          >
            {isSaving ? 'Salvando...' : 'Salvar Rascunho'}
          </Button>
          <Button
            onClick={handleGoLive}
            disabled={isSaving || !name}
            className="flex-1 bg-[#346DF1] hover:bg-blue-700 text-white text-sm"
            type="button"
          >
            Ir ao Vivo 🚀
          </Button>
        </div>
      </div>

      {/* Preview column */}
      <div className="w-[340px] flex-shrink-0 bg-gray-50 flex flex-col items-center justify-center p-6 sticky top-0 h-[calc(100vh-64px)]">
        <p className="text-xs text-gray-400 font-medium mb-4 uppercase tracking-wide">Preview</p>
        <PhonePreview rule={rule} activeTab={previewTab} onTabChange={setPreviewTab} />
      </div>
    </div>
  )
}
