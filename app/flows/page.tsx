'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { GitBranch } from 'lucide-react'
import Link from 'next/link'

export default function FlowsPage() {
  const [flows, setFlows] = useState<Array<{ id: string; name: string; updatedAt: string }>>([])
  const router = useRouter()

  useEffect(() => {
    fetch('/api/flows')
      .then((r) => r.json())
      .then(setFlows)
  }, [])

  async function createFlow() {
    const res = await fetch('/api/flows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Novo Flow' }),
    })
    const data = await res.json()
    router.push(`/flows/${data.id}`)
  }

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Flows</h1>
          <Button onClick={createFlow} className="bg-[#346DF1] hover:bg-blue-700 text-white text-sm">
            + Novo Flow
          </Button>
        </div>

        {flows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <GitBranch className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">Nenhum flow criado ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {flows.map((f) => (
              <Link
                key={f.id}
                href={`/flows/${f.id}`}
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <span className="text-sm font-medium text-gray-900">{f.name}</span>
                <span className="text-xs text-gray-400">
                  {new Date(f.updatedAt).toLocaleDateString('pt-BR')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
