'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { AutomationCard } from '@/components/automations/AutomationCard'
import { AutomationEmptyState } from '@/components/automations/AutomationEmptyState'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface Automation {
  id: string
  name: string
  type: string
  status: string
  _count: { events: number }
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  async function load() {
    const res = await fetch('/api/automations')
    const data = await res.json()
    setAutomations(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta automação?')) return
    await fetch(`/api/automations/${id}`, { method: 'DELETE' })
    setAutomations((prev) => prev.filter((a) => a.id !== id))
  }

  function handleToggle(id: string, newStatus: string) {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    )
  }

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Automações</h1>
            <p className="text-sm text-gray-400 mt-0.5">Gerencie seus fluxos automáticos</p>
          </div>
          <Button
            onClick={() => router.push('/automations/new')}
            className="bg-[#346DF1] hover:bg-blue-700 text-white text-sm"
          >
            + Nova Automação
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : automations.length === 0 ? (
          <AutomationEmptyState onNew={() => router.push('/automations/new')} />
        ) : (
          <div className="space-y-3">
            {automations.map((a) => (
              <AutomationCard
                key={a.id}
                id={a.id}
                name={a.name}
                type={a.type}
                status={a.status}
                eventCount={a._count.events}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
