# OpenChat Visivo — Visão Geral do Projeto

> Fonte única de verdade sobre o que este produto é, o que faz, e como está estruturado.
> Última atualização: 2026-06-20

---

## O que é

OpenChat Visivo é um clone funcional do ManyChat construído especificamente para automatizar interações no Instagram e Facebook do Estúdio Visivo. O produto permite criar automações visuais que respondem automaticamente a comentários, mensagens diretas e interações com Stories.

## Problema que resolve

Ferramentas como ManyChat cobram por usuário ativo e têm planos mensais elevados. O OpenChat oferece as mesmas funcionalidades de automação para a conta própria, sem custo recorrente além da infraestrutura.

## Resultado final esperado

- Comentário em post → DM automático enviado ao comentador
- Keyword em DM → resposta automática configurável
- Story reply/reaction/mention → DM automático
- Follow Gate: só envia link se o usuário seguir o perfil
- Dashboard com métricas de automações executadas
- Editor visual de fluxos (drag-and-drop)
- Interface web protegida por senha

---

## Funcionalidades Implementadas

| Funcionalidade | Status | Observação |
|---|---|---|
| Comment to DM | Implementado | Depende de webhook `comments` |
| DM Keyword | Implementado | Detecta keywords em DMs recebidas |
| Story Reply to DM | Implementado | Via evento `messaging` com referral |
| Story Reaction to DM | Implementado | Via evento `reaction` |
| Story Mention to DM | Implementado | Via evento `mention` |
| Follow Gate | Implementado | Verifica seguidor via API antes de enviar |
| Reply to Comment | Implementado | Resposta pública no comentário |
| Like Comment | Implementado | Curtida automática no comentário |
| Link Button DM | Implementado | Enviado como texto (botões não suportados) |
| Follow-up DM | Implementado | Segunda mensagem após DM inicial |
| Visual Flow Builder | Implementado | React Flow, persistência básica |
| Insights Dashboard | Implementado | Histórico de eventos por automação |
| Settings + OAuth | Implementado | Conecta conta FB/IG via OAuth |
| Página de Privacidade | Implementado | Rota pública `/privacy` |

## Funcionalidades Descartadas / Fora do Escopo

| Funcionalidade | Motivo |
|---|---|
| Multi-tenant (múltiplas contas) | Escopo atual: conta única (Estúdio Visivo) |
| Botões em DMs do Instagram | API não suporta templates com botões |
| Follower check para >200 seguidores | API retorna max 200 por página; não escalável |
| BullMQ/Redis como fila de processamento | Vercel serverless mata workers — substituído por fire-and-forget |
| Instagram Platform OAuth | Rejeitado para apps Business — substituído por Facebook Login OAuth |

---

## Decisões Técnicas

### Por que Next.js App Router
Single repo que serve frontend + backend (API routes). Deploy trivial no Vercel.

### Por que Prisma + Neon (PostgreSQL)
ORM tipado + banco serverless que não cobra por conexões idle.

### Por que sem BullMQ em produção
Workers BullMQ precisam de processo rodando 24/7. Vercel mata instâncias serverless após cada resposta. Solução: webhook processa eventos inline via `processAsync()` (fire-and-forget com `import()` dinâmico).

### Por que Facebook Login OAuth (não Instagram Platform OAuth)
Apps do tipo Business são rejeitados pelo Instagram OAuth com "Invalid platform app". O Facebook Login OAuth suporta todos os tipos de app e concede as mesmas permissões de Instagram.

### Por que `messaging_type: RESPONSE`
A API do Instagram exige que DMs enviadas em resposta a interações usem `RESPONSE` como messaging_type. Requerimento obrigatório, não opcional.

---

## Stack Tecnológico

```
Frontend:   Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4
UI:         shadcn/ui + Radix UI + Lucide React + React Flow
Backend:    Next.js API Routes (serverless)
Banco:      PostgreSQL via Neon + Prisma v7
Auth:       JWT httpOnly cookie (jose) + senha única (AUTH_SECRET/ACCESS_PASSWORD)
Graph API:  Facebook Graph API v19.0 via axios
Deploy:     Vercel (GitHub auto-deploy)
```

---

## Estrutura de Banco de Dados

```prisma
Automation        - configuração de cada automação
  └─ triggerRule  - JSON com regras (keywords, postId, followGate, etc.)
  └─ Flow?        - referência opcional ao fluxo visual

Flow              - fluxo visual (container)
  └─ FlowNode[]   - nós do fluxo (send_message, wait, condition, end)

AutomationEvent   - log de execuções (trigger_fired, dm_sent, etc.)
Contact           - cache de seguidores verificados (ttl: 30min)
AppSetting        - chave-valor para tokens OAuth persistidos no DB
```

---

## Variáveis de Ambiente Necessárias

```env
# Banco
DATABASE_URL=postgresql://...

# Auth
AUTH_SECRET=...
ACCESS_PASSWORD=...

# Meta/Facebook
FB_APP_ID=997136759849459
FB_APP_SECRET=...
FB_PAGE_ACCESS_TOKEN=...       # Token da Página, ~60 dias, renovar via OAuth
FB_WEBHOOK_VERIFY_TOKEN=...
INSTAGRAM_BUSINESS_ID=533913673134517

# App
NEXT_PUBLIC_APP_URL=https://visivochatsource.vercel.app
```

---

## URLs do Projeto

- **Produção:** `https://visivochatsource.vercel.app`
- **Webhook:** `https://visivochatsource.vercel.app/api/webhook`
- **Privacidade:** `https://visivochatsource.vercel.app/privacy`
- **Repositório:** `https://github.com/estudiovisivodev/manychat-clone`
- **Meta App ID:** `997136759849459`
- **Page ID (Estúdio Visivo):** `962368243633567`
- **Instagram ID:** `533913673134517`
