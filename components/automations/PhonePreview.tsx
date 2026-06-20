'use client'
import type { TriggerRule } from '@/types'

interface Props {
  rule: Partial<TriggerRule>
  activeTab: 'post' | 'comments' | 'dm'
  onTabChange: (tab: 'post' | 'comments' | 'dm') => void
}

export function PhonePreview({ rule, activeTab, onTabChange }: Props) {
  const tabs: Array<{ key: 'post' | 'comments' | 'dm'; label: string }> = [
    { key: 'post', label: 'Post' },
    { key: 'comments', label: 'Comentários' },
    { key: 'dm', label: 'DM' },
  ]

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Tab selector */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`px-3 py-1 text-xs rounded-md transition-colors font-medium ${
              activeTab === key
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Phone mockup */}
      <div className="w-64 h-[480px] rounded-[2.5rem] bg-gray-900 border-[6px] border-gray-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Status bar */}
        <div className="h-6 bg-gray-900 flex items-center justify-between px-5 pt-1 flex-shrink-0">
          <span className="text-[9px] text-gray-400">9:41</span>
          <div className="w-16 h-3 bg-gray-800 rounded-full" />
          <div className="flex gap-1">
            <div className="w-3 h-1.5 bg-gray-400 rounded-sm" />
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 bg-white overflow-hidden">
          {activeTab === 'post' && (
            <div className="h-full bg-gray-50 flex items-center justify-center">
              <div className="w-full">
                <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                  <span className="text-3xl">📸</span>
                </div>
                <div className="p-3">
                  <div className="h-2 bg-gray-200 rounded w-3/4 mb-1.5" />
                  <div className="h-2 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="p-3 space-y-2">
              <div className="text-[10px] font-medium text-gray-700 mb-2">Comentários</div>
              <div className="flex gap-2 items-start">
                <div className="w-5 h-5 rounded-full bg-blue-200 flex-shrink-0" />
                <div>
                  <span className="text-[9px] font-semibold">usuário</span>
                  <span className="text-[9px] text-gray-600 ml-1">
                    {rule.keywords?.[0] || 'link'}
                  </span>
                </div>
              </div>
              {rule.replyToComment && rule.commentReplies?.[0] && (
                <div className="ml-5 bg-blue-50 rounded-lg p-2">
                  <span className="text-[9px] text-blue-700">{rule.commentReplies[0]}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'dm' && (
            <div className="flex flex-col h-full bg-white">
              <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
                <span className="text-[9px] font-medium">Sua conta</span>
              </div>
              <div className="flex-1 p-3 space-y-2 overflow-auto">
                {rule.openingDm && (
                  <div className="bg-[#346DF1] rounded-2xl rounded-tl-sm px-3 py-1.5 max-w-[80%]">
                    <p className="text-[9px] text-white">{rule.openingDm}</p>
                  </div>
                )}
                {rule.followGateEnabled && rule.followGateDm && (
                  <div className="bg-[#346DF1] rounded-2xl rounded-tl-sm px-3 py-1.5 max-w-[85%]">
                    <p className="text-[9px] text-white">{rule.followGateDm}</p>
                  </div>
                )}
                {rule.linkButton && (
                  <div className="bg-[#346DF1] rounded-2xl rounded-tl-sm px-3 py-1.5 max-w-[80%]">
                    <p className="text-[9px] text-white mb-1.5">📎 Aqui está o link:</p>
                    <div className="border border-white/30 rounded-lg px-2 py-1 text-center">
                      <span className="text-[8px] text-white font-medium">{rule.linkButton.label}</span>
                    </div>
                  </div>
                )}
                {rule.followUpDm && (
                  <div className="bg-[#346DF1] rounded-2xl rounded-tl-sm px-3 py-1.5 max-w-[80%]">
                    <p className="text-[9px] text-white">{rule.followUpDm}</p>
                  </div>
                )}
                {!rule.openingDm && !rule.linkButton && (
                  <p className="text-[9px] text-gray-300 text-center pt-8">
                    Configure as mensagens ao lado
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
