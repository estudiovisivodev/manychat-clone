import { AppShell } from '@/components/layout/AppShell'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
type AutomationEvent = { id: string; eventType: string; igUserId: string | null; createdAt: Date; automationId: string }

export default async function AutomationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let automation = null
  try {
    automation = await db.automation.findUnique({
      where: { id },
      include: { events: { orderBy: { createdAt: 'desc' }, take: 100 } },
    })
  } catch {
    /* DB unavailable */
  }

  if (!automation) notFound()

  const dmsSent = automation.events.filter((e: { eventType: string }) => e.eventType === 'dm_sent').length
  const triggersFired = automation.events.filter((e: { eventType: string }) => e.eventType === 'trigger_fired').length
  const followGatePassed = automation.events.filter((e: { eventType: string }) => e.eventType === 'follow_gate_passed').length
  const followGateBlocked = automation.events.filter((e: { eventType: string }) => e.eventType === 'follow_gate_blocked').length
  const ctr = triggersFired > 0 ? ((dmsSent / triggersFired) * 100).toFixed(1) : '0'

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/automations" className="text-gray-400 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">{automation.name}</h1>
          {automation.status === 'live' && (
            <Badge className="bg-green-100 text-green-700 border-0 text-xs">LIVE</Badge>
          )}
          {automation.status === 'paused' && (
            <Badge variant="secondary" className="text-xs">PAUSADO</Badge>
          )}
          <div className="ml-auto">
            <Link href={`/automations/${id}/edit`}>
              <Button size="sm" variant="outline">
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Gatilhos', value: triggersFired },
            { label: 'DMs Enviadas', value: dmsSent },
            { label: 'CTR', value: `${ctr}%` },
            { label: 'Follow Gate Pass', value: followGatePassed },
          ].map(({ label, value }) => (
            <Card key={label} className="border-gray-100 shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs text-gray-500 font-medium">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold text-gray-900">{value}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {followGateBlocked > 0 && (
          <Card className="border-orange-100 bg-orange-50 shadow-sm mb-6">
            <CardContent className="pt-4">
              <p className="text-sm text-orange-700">
                <strong>{followGateBlocked}</strong> usuários foram bloqueados pelo Follow Gate e
                redirecionados para seguir o perfil.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-700">Eventos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {automation.events.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">
                Nenhum evento ainda. Publique a automação e interaja com o post.
              </p>
            ) : (
              <div className="space-y-2">
                {automation.events.slice(0, 20).map((ev: AutomationEvent) => (
                  <div key={ev.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          ev.eventType === 'dm_sent'
                            ? 'bg-green-400'
                            : ev.eventType === 'follow_gate_blocked'
                              ? 'bg-orange-400'
                              : ev.eventType === 'follow_gate_passed'
                                ? 'bg-blue-400'
                                : 'bg-gray-300'
                        }`}
                      />
                      <span className="text-xs text-gray-600">{ev.eventType.replace(/_/g, ' ')}</span>
                      {ev.igUserId && (
                        <span className="text-xs text-gray-400">· user {ev.igUserId.slice(-6)}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {new Date(ev.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
