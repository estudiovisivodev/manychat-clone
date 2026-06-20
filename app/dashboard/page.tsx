import { AppShell } from '@/components/layout/AppShell'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, MousePointerClick, Users, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  let totalAutomations = 0
  let liveAutomations = 0
  let totalEvents = 0
  let totalContacts = 0

  try {
    ;[totalAutomations, liveAutomations, totalEvents, totalContacts] = await Promise.all([
      db.automation.count(),
      db.automation.count({ where: { status: 'live' } }),
      db.automationEvent.count({ where: { eventType: 'dm_sent' } }),
      db.contact.count(),
    ])
  } catch {
    /* DB not available */
  }

  const metrics = [
    { label: 'Automações Ativas', value: liveAutomations, icon: Zap, color: 'text-blue-600' },
    { label: 'Total de Automações', value: totalAutomations, icon: TrendingUp, color: 'text-purple-600' },
    { label: 'DMs Enviadas', value: totalEvents, icon: MousePointerClick, color: 'text-green-600' },
    { label: 'Contatos', value: totalContacts, icon: Users, color: 'text-orange-600' },
  ]

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Olá! 👋</h1>
          <p className="text-sm text-gray-500 mt-1">Veja o resumo das suas automações</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metrics.map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-gray-100 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-gray-500">{label}</CardTitle>
                <Icon className={`w-4 h-4 ${color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-700">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400 text-center py-8">Crie sua primeira automação para ver métricas aqui</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
