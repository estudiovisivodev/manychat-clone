'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { EasyBuilder } from '@/components/automations/EasyBuilder'
import type { TriggerRule } from '@/types'

export default function EditAutomationPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const [automation, setAutomation] = useState<{ name: string; triggerRule: TriggerRule } | null>(null)
  const [posts, setPosts] = useState<Array<{ id: string; media_type: string; timestamp: string }>>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/automations/${id}`).then(r => r.json()),
      fetch('/api/instagram/posts').then(r => r.json()).catch(() => []),
    ]).then(([auto, p]) => {
      setAutomation({ name: auto.name, triggerRule: auto.triggerRule })
      setPosts(Array.isArray(p) ? p : [])
    })
  }, [id])

  async function handleSave(name: string, rule: TriggerRule) {
    setSaving(true)
    await fetch(`/api/automations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, triggerRule: rule }),
    })
    setSaving(false)
    router.push(`/automations/${id}`)
  }

  async function handleGoLive(name: string, rule: TriggerRule) {
    setSaving(true)
    await fetch(`/api/automations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, triggerRule: rule }),
    })
    await fetch(`/api/automations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'live' }),
    })
    setSaving(false)
    router.push(`/automations/${id}`)
  }

  if (!automation) return (
    <AppShell>
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-gray-400">Carregando...</div>
      </div>
    </AppShell>
  )

  return (
    <AppShell>
      <div className="border-b border-gray-100 px-8 py-4 bg-white">
        <h1 className="text-sm font-semibold text-gray-900">Editar Automação</h1>
      </div>
      <EasyBuilder
        automationId={id}
        initialRule={automation.triggerRule}
        initialName={automation.name}
        posts={posts}
        onSave={handleSave}
        onGoLive={handleGoLive}
        isSaving={saving}
      />
    </AppShell>
  )
}
