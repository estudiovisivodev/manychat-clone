'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { EasyBuilder } from '@/components/automations/EasyBuilder'
import type { TriggerRule } from '@/types'

interface InstagramPost {
  id: string
  media_type: string
  timestamp: string
}

export default function NewAutomationPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<InstagramPost[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/instagram/posts')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPosts(data)
      })
      .catch(() => {
        // silent fail — posts will be empty
      })
  }, [])

  async function handleSave(name: string, rule: TriggerRule) {
    setSaving(true)
    try {
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: 'comment_to_dm', triggerRule: rule }),
      })
      const data = await res.json()
      router.push(`/automations/${data.id}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleGoLive(name: string, rule: TriggerRule) {
    setSaving(true)
    try {
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: 'comment_to_dm', triggerRule: rule }),
      })
      const data = await res.json()
      await fetch(`/api/automations/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'live' }),
      })
      router.push(`/automations/${data.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="border-b border-gray-100 px-8 py-4 bg-white flex items-center justify-between">
        <h1 className="text-sm font-semibold text-gray-900">
          Nova Automação — Comentário para DM
        </h1>
      </div>
      <EasyBuilder
        posts={posts}
        onSave={handleSave}
        onGoLive={handleGoLive}
        isSaving={saving}
      />
    </AppShell>
  )
}
