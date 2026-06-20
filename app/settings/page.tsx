import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getRecentPosts } from '@/lib/facebook'
import { db } from '@/lib/db'

async function testConnection() {
  try {
    const posts = await getRecentPosts()
    return { ok: true, postCount: posts.length }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

async function testIgBusinessConnection() {
  try {
    const setting = await db.appSetting.findUnique({ where: { key: 'ig_business_access_token' } })
    return { connected: !!setting?.value }
  } catch {
    return { connected: false }
  }
}

export default async function SettingsPage() {
  const connection = await testConnection()
  const igBusiness = await testIgBusinessConnection()
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`

  return (
    <AppShell>
      <div className="p-8 max-w-2xl">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Configurações</h1>

        <Card className="border-gray-100 shadow-sm mb-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-700">
              Conexão com Facebook/Instagram
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status da API</span>
              {connection.ok ? (
                <Badge className="bg-green-100 text-green-700 border-0">Conectado</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-700 border-0">Erro</Badge>
              )}
            </div>
            {connection.ok && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Posts encontrados</span>
                <span className="text-sm font-medium text-gray-900">{connection.postCount}</span>
              </div>
            )}
            {!connection.ok && (
              <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{connection.error}</p>
            )}
            <div className="pt-1">
              <a
                href="/api/instagram/connect"
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                {connection.ok ? '↻ Reconectar Instagram' : '→ Conectar Instagram'}
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm mb-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-700">
              Instagram Business Login (Private Reply / DM)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500">
              Necessário para enviar DMs privadas via resposta a comentários (Private Reply API). Use este login separado do Facebook Login acima.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Token Instagram Business</span>
              {igBusiness.connected ? (
                <Badge className="bg-green-100 text-green-700 border-0">Configurado</Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-700 border-0">Pendente</Badge>
              )}
            </div>
            <div className="pt-1">
              <a
                href="/api/instagram/business-connect"
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
              >
                {igBusiness.connected ? '↻ Reconectar Instagram Business' : '→ Conectar Instagram Business Login'}
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm mb-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-700">Webhook URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500">
              Configure este URL no Facebook Developers → Webhooks para receber eventos em tempo real:
            </p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
              <code className="text-xs text-gray-800 flex-1 break-all">{webhookUrl}</code>
            </div>
            <div className="text-xs text-gray-500">
              <strong>Verify Token:</strong>{' '}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                {process.env.FB_WEBHOOK_VERIFY_TOKEN ? '••••••••' + process.env.FB_WEBHOOK_VERIFY_TOKEN.slice(-4) : 'not set'}
              </code>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-700">Campos para assinar:</p>
              <ul className="list-disc list-inside space-y-0.5 text-gray-500">
                <li>messages</li>
                <li>messaging_postbacks</li>
                <li>comments</li>
                <li>feed</li>
                <li>story_insights</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-700">Variáveis de Ambiente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              {[
                { key: 'FB_PAGE_ACCESS_TOKEN', label: 'Token de Acesso' },
                { key: 'INSTAGRAM_BUSINESS_ID', label: 'ID da Conta Instagram' },
                { key: 'FB_WEBHOOK_VERIFY_TOKEN', label: 'Token de Verificação' },
                { key: 'DATABASE_URL', label: 'Banco de Dados' },
                { key: 'REDIS_URL', label: 'Redis' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-600">{label}</span>
                  <Badge variant={process.env[key] ? 'default' : 'destructive'} className="text-[10px]">
                    {process.env[key] ? '✓ Configurado' : '✗ Ausente'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
