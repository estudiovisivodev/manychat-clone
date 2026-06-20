# Arquitetura — OpenChat Visivo

> Documento de referência sobre as decisões arquiteturais do projeto.
> Última atualização: 2026-06-20

---

## Diagrama de Fluxo Principal

```
Instagram/Facebook
       │
       │ POST (evento: comentário, DM, story)
       ▼
app/api/webhook/route.ts
       │
       ├─ Verifica assinatura HMAC-SHA256 (FB_APP_SECRET)
       ├─ Parseia evento (comment / dm / story)
       └─ processAsync(entry) ←── fire-and-forget
                │
                ▼
         lib/automation-engine.ts
                │
                ├─ Busca automações com status "live" no banco
                ├─ Verifica filtros (postId, keywords)
                ├─ Opcional: replyToComment() + likeComment()
                ├─ Follow Gate: checkIsFollower() → lib/follow-gate.ts
                └─ sendDM() ←─── lib/facebook.ts
                                     │
                                     ▼
                             Graph API v19.0
                          POST /{IG_ID}/messages
```

---

## Estrutura de Pastas

```
manychat-clone/
├── app/
│   ├── api/
│   │   ├── auth/           # login/logout
│   │   ├── automations/    # CRUD de automações
│   │   ├── flows/          # CRUD de fluxos
│   │   ├── instagram/      # OAuth connect/callback, follow-check, posts
│   │   └── webhook/        # Recebe eventos do Facebook
│   ├── automations/        # Páginas de listagem e edição
│   ├── dashboard/          # Página de métricas
│   ├── flows/              # Flow Builder visual
│   ├── login/              # Página de login
│   ├── privacy/            # Política de privacidade (pública)
│   └── settings/           # Configurações e status do webhook
├── components/
│   ├── automations/        # EasyBuilder, AutomationCard, PhonePreview
│   ├── flow-builder/       # FlowCanvas + nós customizados
│   ├── layout/             # AppShell, Sidebar
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── automation-engine.ts # Lógica principal de processamento
│   ├── db.ts               # Instância do Prisma Client
│   ├── facebook.ts         # Wrapper da Graph API
│   ├── follow-gate.ts      # Verificação de seguidor
│   ├── queue.ts            # BullMQ (infraestrutura, não usada em prod)
│   ├── utils.ts            # Utilitários gerais
│   └── validators.ts       # Schemas Zod
├── prisma/
│   └── schema.prisma       # Schema do banco de dados
├── types/
│   └── index.ts            # Types TypeScript compartilhados
├── middleware.ts            # Proteção de rotas + rotas públicas
└── docs/ tutorial/ research/ bugs/ changelog/ architecture/ api/ roadmap/
```

---

## Decisões Arquiteturais Chave

### 1. Serverless com Fire-and-Forget

**Problema:** Vercel destrói instâncias serverless após cada request. Workers BullMQ não sobrevivem.

**Solução:** O webhook processa eventos diretamente (inline) usando import dinâmico:

```typescript
function processAsync(entry: WebhookEntry) {
  import('@/lib/automation-engine')
    .then(({ processWebhookJob }) => processWebhookJob(entry))
    .catch((err) => console.error('[Webhook] error:', err))
}
```

O Facebook recebe 200 imediatamente. O processamento continua enquanto a instância ainda está ativa.

**Trade-off:** Sem garantia de entrega se a instância for encerrada antes do fim do processamento. Para o volume atual, aceitável.

### 2. Auth por Senha Única

**Problema:** Sem necessidade de multi-usuário. Login simples.

**Solução:** Senha única configurada como env var (`ACCESS_PASSWORD`). JWT httpOnly cookie com 30 dias de validade.

**Trade-off:** Sem recuperação de senha, sem multi-usuário. Proposital.

### 3. Tokens Persistidos no Banco

**Problema:** Page Access Token precisa ser renovado periodicamente e acessível no servidor.

**Solução:** Tabela `AppSetting` (chave-valor) para tokens OAuth. Renovação via fluxo OAuth em `/api/instagram/callback`.

### 4. Sem BullMQ em Produção

**Decisão:** BullMQ foi planejado e instalado mas não é usado no fluxo principal em produção no Vercel.

**Motivo:** Serverless incompatível com workers de longa duração.

**Infraestrutura mantida:** `lib/queue.ts` permanece caso haja migração para servidor dedicado no futuro.

### 5. triggerRule como JSON

**Problema:** Cada tipo de automação tem regras diferentes. Evitar múltiplas tabelas.

**Solução:** Campo `triggerRule` como JSON livre no banco, tipado via TypeScript (`TriggerRule`). Validação no frontend com Zod antes de salvar.

---

## Middleware e Rotas Públicas

```typescript
const PUBLIC_PATHS = [
  '/login',
  '/privacy',              // Política de privacidade
  '/api/auth/login',
  '/api/auth/logout',
  '/api/webhook',          // Recebe eventos do Facebook (sem auth)
  '/api/instagram/connect', // Inicia OAuth
  '/api/instagram/callback', // Callback OAuth
]
```

Todas as outras rotas exigem cookie JWT válido.

---

## Modelo de Dados Simplificado

```
Automation (1) ──────── (many) AutomationEvent
     │
     └── Flow (1) ──── (many) FlowNode

Contact (isolado — cache de seguidores)
AppSetting (isolado — tokens OAuth)
```
