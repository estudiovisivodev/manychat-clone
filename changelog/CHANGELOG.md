# CHANGELOG — OpenChat Visivo

Registro cronológico de todas as decisões, mudanças, remoções e substituições.

---

## [0.5.0] — 2026-06-20 (sessão atual)

### Adicionado
- Página pública de Política de Privacidade em `/privacy` (necessária para App Review e modo live da Meta)
- Rota `/privacy` adicionada às rotas públicas no `middleware.ts`

### Corrigido
- OAuth callback agora salva o Page Access Token no banco (`AppSetting`) e renova automaticamente
- Subscription da Página ao webhook corrigida para incluir `pages_manage_metadata` + `pages_messaging`

### Descobertas
- App Meta publicado em modo live (**"Publicado"** confirmado no dashboard)
- Webhook do Instagram subscrito com 4 campos: `comments, messages, messaging_postbacks, messaging_referral`
- Instagram Platform OAuth (`instagram.com/oauth/authorize`) rejeita apps Business com "Invalid platform app" — substituído por Facebook Login OAuth

---

## [0.4.0] — 2026-06-20 (manhã)

### Corrigido
- **CRÍTICO**: BullMQ worker não processava jobs no Vercel (serverless mata processos após cada response)
  - Solução: removida dependência da fila; webhook chama `processWebhookJob()` diretamente via `import()` dinâmico (fire-and-forget)
  - Commit: `d235b2c`

### Adicionado
- `app/api/instagram/connect/route.ts` — inicia OAuth via Facebook Login
- `app/api/instagram/callback/route.ts` — callback OAuth: troca código → token curto → token longo (~60 dias) → Page token → salva no DB → subscreve webhook da Página
- `prisma/schema.prisma` — modelo `AppSetting` (chave-valor para tokens persistidos)
- Messenger product adicionado ao app Meta → desbloqueou permissões `pages_manage_metadata` e `pages_messaging`

### Removido
- Chamadas `safeAddToQueue()` do webhook handler
- Dependência do BullMQ no fluxo principal de webhooks (infraestrutura mantida mas inativa)

### Descobertas
- Token de 1h (short-lived) expirava antes de qualquer uso — processo de 3 passos obrigatório: short-lived → long-lived (~60 dias) → page token
- `pages_messaging` obrigatório para subscrever a Página ao webhook de mensagens
- `pages_manage_metadata` obrigatório para chamar `POST /{page-id}/subscribed_apps`
- Em modo de desenvolvimento, apenas contas com função no app (admin/developer/tester) disparam webhooks

---

## [0.3.0] — 2026-06-19 (pós-implementação inicial)

### Corrigido (pós-review final)
7 issues corrigidos após revisão completa do branch:
1. Verificação de assinatura HMAC-SHA256 adicionada (X-Hub-Signature-256 + FB_APP_SECRET)
2. `onDelete: Cascade` adicionado em `AutomationEvent.automation` no schema
3. Página `/automations/[id]/edit/page.tsx` criada (botão Editar estava com 404)
4. Follow Gate movido para ANTES do envio do DM inicial em `executeDmFlow`
5. Verify token mascarado na Settings page (apenas 4 últimos chars visíveis)
6. Query de seguidores corrigida para usar `limit: 200` (máximo da API)
7. `sendDMWithButton` substituído por texto + URL inline (Instagram não suporta button templates)

---

## [0.2.0] — 2026-06-19 (Tasks 6-13)

### Adicionado
- Rotas de API para automações: `GET/POST /api/automations`, `GET/PATCH/DELETE /api/automations/[id]`
- Rotas de API para fluxos: `GET/POST /api/flows`, `GET/PATCH/DELETE /api/flows/[id]`
- Página de lista de automações com filtros e badges de status
- Easy Builder: editor de três colunas (config + preview + tel)
- Página de Insights por automação (histórico de eventos)
- Flow Builder visual com React Flow (nós: trigger, send_message, wait, condition, end)
- Settings page com status de webhook, configuração de token, e botão OAuth
- Follow Gate API: `POST /api/instagram/follow-check`
- Posts API: `GET /api/instagram/posts`
- BullMQ worker startup via `instrumentation.ts` (depois descontinuado em produção)

### Decisões
- Botões em DMs do Instagram: API rejeita templates — enviado como texto com URL inline
- Keyword input sempre visível no Easy Builder (melhor UX que toggle)
- Edge persistence no Flow Builder: v1 salva edges junto com o nó source

---

## [0.1.0] — 2026-06-19 (Tasks 1-5)

### Adicionado
- Scaffold Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui
- Schema Prisma: Automation, Flow, FlowNode, AutomationEvent, Contact
- AppShell com sidebar de 220px (Automations, Flows, Dashboard, Settings)
- Dashboard com cards de métricas (eventos últimas 24h, 7d, 30d)
- Facebook Graph API wrapper (`lib/facebook.ts`): sendDM, sendDMWithButton, replyToComment, likeComment, getRecentPosts
- Webhook handler completo com verificação HMAC e parser de eventos
- Automation engine: handleCommentEvent, handleDmEvent, handleStoryEvent
- Auth: login por senha única, cookie JWT httpOnly 30 dias, middleware de proteção
- Deploy inicial no Vercel via GitHub

### Decisões de arquitetura
- Nome: OpenChat (rebrand de AutoDM)
- Cor primária: `#346DF1`
- Layout three-column no editor
- Prisma v7 com adapter pg (driver direto, sem connection pooler)
- jose para JWT (sem dependências extras de auth)
- Sem testes automatizados (projeto de uso interno)
