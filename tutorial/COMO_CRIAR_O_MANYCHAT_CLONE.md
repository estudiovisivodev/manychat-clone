# Como Criar um Clone do ManyChat — Tutorial Completo

> Uma pessoa sem conhecimento prévio deve conseguir reproduzir todo o projeto seguindo apenas este documento.
> Versão: 1.0 | Atualizado: 2026-06-20

---

## 1. Visão Geral

### Objetivo
Criar uma ferramenta de automação de Instagram e Facebook similar ao ManyChat, hospedada em infraestrutura própria, sem custo de assinatura por usuário.

### Resultado Final
Uma aplicação web com:
- Painel de controle protegido por senha
- Editor visual de automações
- Automações: comentário → DM, keyword em DM → resposta, story → DM
- Follow Gate: verifica se o usuário segue o perfil antes de enviar
- Dashboard com métricas de eventos
- Integração real com a API do Instagram/Facebook

### Funcionalidades Disponíveis
- Comment to DM (com suporte a keyword, reply público, curtida)
- DM Keyword Detection
- Story Reply / Reaction / Mention → DM
- Follow Gate com mensagem de redirecionamento
- Visual Flow Builder
- Insights por automação

---

## 2. Pré-requisitos

### Contas Necessárias
- **Conta Meta for Developers**: developers.facebook.com
- **Instagram Business**: conta Instagram convertida para Business ou Creator
- **Página do Facebook**: vinculada à conta Instagram Business
- **Conta Vercel**: vercel.com (plano gratuito é suficiente)
- **Conta Neon**: neon.tech (banco PostgreSQL serverless gratuito)
- **Conta GitHub**: para repositório e deploy automático

### Permissões no Meta
O app Meta precisa das seguintes permissões:
- `instagram_manage_messages` — para enviar DMs no Instagram
- `instagram_manage_comments` — para ler comentários e responder
- `pages_messaging` — para subscrever a Página ao webhook de mensagens
- `pages_manage_metadata` — para configurar webhook da Página
- `pages_show_list` — para listar páginas do usuário
- `pages_read_engagement` — para leitura básica de engajamento
- `instagram_basic` — acesso básico à conta Instagram

### Tokens Necessários
- **FB_APP_ID**: ID do app no Meta for Developers
- **FB_APP_SECRET**: Secret do app
- **FB_PAGE_ACCESS_TOKEN**: Token de acesso da Página (~60 dias de validade)
- **FB_WEBHOOK_VERIFY_TOKEN**: Token personalizado para verificação do webhook (você cria)
- **INSTAGRAM_BUSINESS_ID**: ID numérico da conta Instagram Business

---

## 3. Arquitetura

### Frontend
- Next.js 16 (App Router) + React 19
- Tailwind CSS v4 + shadcn/ui + Radix UI
- React Flow (editor visual de fluxos)

### Backend
- Next.js API Routes (serverless, rodando no Vercel)
- Webhook handler que processa eventos do Facebook/Instagram
- Automation engine que executa as regras de cada automação

### Banco de Dados
- PostgreSQL via Neon (serverless, sem custo por conexões idle)
- Prisma v7 como ORM (type-safe, migrations automáticas)

### Integração com Instagram
- Facebook Graph API v19.0
- OAuth via Facebook Login (não Instagram Platform OAuth)
- Page Access Token (gerado e renovado pelo fluxo OAuth do app)

### Webhook Flow
```
Instagram/Facebook → POST /api/webhook → verifica assinatura HMAC
                                       → parseia evento (comment/DM/story)
                                       → processAsync() fire-and-forget
                                       → automation-engine.ts
                                       → sendDM() via Graph API
```

---

## 4. Configuração do Ambiente

### 4.1 Criar App no Meta for Developers

1. Acesse `developers.facebook.com` → **Meus apps** → **Criar app**
2. Selecione tipo: **Business**
3. Nome do app: (ex: OpenChat Visivo)
4. Anote o **App ID** e gere o **App Secret** em Configurações → Básico

### 4.2 Adicionar Produtos ao App

1. No painel do app → **Adicionar casos de uso** → **Messenger from Meta**
   - Isso desbloqueia: `pages_messaging`, `pages_manage_metadata`
2. No painel do app → **Login do Facebook** → Adicionar
   - Em Configurações → URIs de redirecionamento OAuth válidos, adicione:
     `https://SEU_DOMINIO.vercel.app/api/instagram/callback`

### 4.3 Configurar Permissões

Em **Permissões e recursos**, solicite acesso às permissões:
- `instagram_manage_messages`
- `instagram_manage_comments`
- `pages_messaging`
- `pages_manage_metadata`
- `pages_show_list`
- `pages_read_engagement`
- `instagram_basic`

### 4.4 Criar Banco de Dados no Neon

1. Acesse `neon.tech` → criar projeto
2. Copie a **Connection String** (formato `postgresql://...`)
3. Use essa string como `DATABASE_URL`

### 4.5 Variáveis de Ambiente

Crie `.env.local` na raiz do projeto:

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
AUTH_SECRET=string_aleatoria_longa_e_segura
ACCESS_PASSWORD=sua_senha_de_acesso
FB_APP_ID=seu_app_id
FB_APP_SECRET=seu_app_secret
FB_PAGE_ACCESS_TOKEN=token_da_pagina
FB_WEBHOOK_VERIFY_TOKEN=token_que_voce_inventar_ex_meutoken123
INSTAGRAM_BUSINESS_ID=id_numerico_do_instagram
NEXT_PUBLIC_APP_URL=https://SEU_DOMINIO.vercel.app
```

---

## 5. Construção do Projeto

### 5.1 Inicializar o Projeto

```bash
npx create-next-app@latest meu-clone --typescript --tailwind --app
cd meu-clone
```

### 5.2 Instalar Dependências

```bash
npm install @prisma/client prisma @prisma/adapter-pg pg
npm install axios jose zod
npm install lucide-react reactflow
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-switch @radix-ui/react-tabs
npm install class-variance-authority clsx tailwind-merge
npm install bullmq ioredis  # infraestrutura, não usada em produção serverless
```

### 5.3 Configurar Prisma

```bash
npx prisma init
```

Edite `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model Automation {
  id          String   @id @default(cuid())
  name        String
  type        String
  status      String   @default("draft")
  triggerRule Json
  flowId      String?
  flow        Flow?    @relation(fields: [flowId], references: [id])
  events      AutomationEvent[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Flow {
  id          String     @id @default(cuid())
  name        String
  nodes       FlowNode[]
  automations Automation[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model FlowNode {
  id        String   @id @default(cuid())
  flowId    String
  flow      Flow     @relation(fields: [flowId], references: [id], onDelete: Cascade)
  type      String
  position  Json
  data      Json
  edges     Json     @default("[]")
  createdAt DateTime @default(now())
}

model Contact {
  id          String    @id @default(cuid())
  igUserId    String    @unique
  username    String?
  isFollower  Boolean   @default(false)
  lastChecked DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model AutomationEvent {
  id           String     @id @default(cuid())
  automationId String
  automation   Automation @relation(fields: [automationId], references: [id], onDelete: Cascade)
  eventType    String
  igUserId     String?
  metadata     Json       @default("{}")
  createdAt    DateTime   @default(now())
}

model AppSetting {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```

```bash
npx prisma db push
npx prisma generate
```

---

## 6. Configuração dos Webhooks

### 6.1 Endpoint de Verificação

O Facebook verifica o webhook com um GET request. Crie `app/api/webhook/route.ts`:

```typescript
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const VERIFY_TOKEN = process.env.FB_WEBHOOK_VERIFY_TOKEN ?? ''

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode')
  const token = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### 6.2 Receber Eventos (POST)

Adicione o handler POST no mesmo arquivo. Pontos críticos:
- **Sempre retorne 200** para o Facebook, mesmo em caso de erro
- **Verificar assinatura HMAC** (`x-hub-signature-256`)
- **Processar de forma assíncrona** (fire-and-forget)

```typescript
import { createHmac } from 'crypto'

async function verifySignature(req: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.FB_APP_SECRET
  if (!secret) return true
  const signature = req.headers.get('x-hub-signature-256') ?? ''
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
  return signature === expected
}

function processAsync(entry: WebhookEntry) {
  import('@/lib/automation-engine')
    .then(({ processWebhookJob }) => processWebhookJob(entry))
    .catch((err) => console.error('[Webhook] error:', err))
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    if (!(await verifySignature(req, rawBody))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    const body = JSON.parse(rawBody)
    // ... parsear eventos e chamar processAsync()
    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ status: 'ok' }) // sempre 200
  }
}
```

### 6.3 Configurar no Meta for Developers

1. **Messenger from Meta** → Configurações da API do Messenger → Configure webhooks
2. URL de callback: `https://SEU_DOMINIO.vercel.app/api/webhook`
3. Token de verificação: valor de `FB_WEBHOOK_VERIFY_TOKEN`
4. Clique em **Verificar e salvar**
5. Assinar os campos: `messages`, `messaging_postbacks`, `messaging_referrals`, `mention`

### 6.4 Configurar Webhook do Instagram

1. **Messenger from Meta** → Configurações do Instagram → Webhooks
2. Verificar se a URL está correta
3. Na seção Páginas, a Página deve aparecer com os campos subscritos:
   `comments, messages, messaging_postbacks, messaging_referral`

### 6.5 Publicar Subscrições de App

Via Graph API Explorer ou no callback OAuth, execute:

```bash
# Subscrição no nível do app para objeto instagram
POST https://graph.facebook.com/{APP_ID}/subscriptions
  ?object=instagram
  &callback_url=https://SEU_DOMINIO.vercel.app/api/webhook
  &fields=comments,messages,messaging_postbacks,messaging_referrals
  &verify_token=SEU_TOKEN
  &access_token={APP_ID}|{APP_SECRET}

# Subscrição da Página específica
POST https://graph.facebook.com/{PAGE_ID}/subscribed_apps
  ?subscribed_fields=messages,messaging_postbacks,mention,messaging_referrals
  &access_token={PAGE_ACCESS_TOKEN}
```

---

## 7. Integração com Instagram

### 7.1 Obter Page Access Token (3 passos)

**Passo 1 — Token curto** (Graph API Explorer):
- Selecione seu app + User Token
- Adicione permissões: `instagram_manage_messages, instagram_manage_comments, instagram_basic, pages_show_list, pages_read_engagement, pages_manage_metadata, pages_messaging`
- Gere o token

**Passo 2 — Token longo** (~60 dias):
```
GET https://graph.facebook.com/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={APP_ID}
  &client_secret={APP_SECRET}
  &fb_exchange_token={TOKEN_CURTO}
```

**Passo 3 — Page Token**:
```
GET https://graph.facebook.com/v19.0/me/accounts
  ?access_token={TOKEN_LONGO}
```
Encontre sua página pelo nome/ID e copie o `access_token` dela.

### 7.2 Automatizar via OAuth

Crie `app/api/instagram/connect/route.ts`:
```typescript
export async function GET() {
  const url = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  url.searchParams.set('client_id', process.env.FB_APP_ID!)
  url.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`)
  url.searchParams.set('scope', 'instagram_manage_messages,instagram_manage_comments,instagram_basic,pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging')
  url.searchParams.set('response_type', 'code')
  return NextResponse.redirect(url.toString())
}
```

> **ATENÇÃO**: Use `facebook.com/v19.0/dialog/oauth` — NÃO use `instagram.com/oauth/authorize`. Apps do tipo Business são rejeitados pelo endpoint do Instagram.

### 7.3 Descobrir o Instagram Business ID

```
GET https://graph.facebook.com/v19.0/{PAGE_ID}?fields=instagram_business_account&access_token={PAGE_TOKEN}
```
O campo `instagram_business_account.id` é o `INSTAGRAM_BUSINESS_ID`.

---

## 8. Sistema de Fluxos

O Flow Builder usa React Flow para editor visual. Cada automação pode ter um fluxo associado (opcional).

### Tipos de Nós
- `trigger` — ponto de entrada (gerado automaticamente)
- `send_message` — envia DM com texto configurável
- `wait` — aguarda N segundos/minutos antes do próximo nó
- `condition` — bifurca o fluxo por condição
- `end` — finaliza o fluxo

### Persistência
Cada nó é salvo na tabela `FlowNode` com `position` (coordenadas x,y) e `edges` (conexões).

---

## 9. Sistema Comment To DM

### Como funciona
1. Usuário comenta em um post do Instagram
2. Meta envia evento para o webhook (`field: comments`)
3. Webhook chama `handleCommentEvent()`
4. Engine busca automações `comment_to_dm` com status `live`
5. Verifica filtros (postId específico, keywords)
6. Opcionalmente responde/curte o comentário publicamente
7. Verifica Follow Gate (se habilitado)
8. Envia DM(s) configuradas

### Configuração via TriggerRule
```typescript
interface TriggerRule {
  postId?: string           // undefined = qualquer post
  keywords?: string[]       // vazio = qualquer comentário
  keywordMatchType?: 'any' | 'all'
  replyToComment?: boolean  // resposta pública
  commentReplies?: string[] // textos aleatórios para reply
  openingDm?: string        // DM principal
  followGateEnabled?: boolean
  followGateDm?: string     // DM enviada se não for seguidor
  linkButton?: { label: string; url: string }  // enviado como texto
  followUpDm?: string       // DM adicional após a principal
}
```

### Limitações
- Requer permissão `instagram_manage_comments` para receber eventos
- Em modo de desenvolvimento da Meta, funciona apenas para testadores
- Em modo live, funciona para qualquer usuário (validar após publicação)

---

## 10. Sistema Story To DM

### Eventos Suportados

| Evento | Webhook Field | Tipo de Automação |
|---|---|---|
| Usuário responde um Story | `messaging` com `referral` | `story_reply` |
| Usuário reage a um Story | `messaging` com `reaction` | `story_reaction` |
| Usuário menciona no Story | `messaging` com `mention` | `story_mention` |

### Fluxo
- Mesmo fluxo do Comment to DM
- Engine detecta o tipo e busca automações do tipo correspondente
- Executa `executeDmFlow()` com as mesmas regras

---

## 11. Sistema Keyword To DM

### Como funciona
1. Usuário envia DM com uma palavra-chave
2. Meta envia evento `messages` para o webhook
3. Engine busca automações `dm_keyword` com status `live`
4. Verifica se o texto do DM contém as keywords configuradas
5. Executa o fluxo de resposta

### Matching
- `keywordMatchType: 'any'` — qualquer keyword deve estar presente
- `keywordMatchType: 'all'` — todas as keywords devem estar presentes
- Case-insensitive (texto é convertido para lowercase)

---

## 12. Automação por Post

No Easy Builder, é possível filtrar a automação por post específico:
1. Na seção "Post específico", selecione um post da lista
2. A automação só dispara para comentários naquele post
3. Sem seleção = qualquer post

Posts são listados via `GET /{ig-id}/media` da Graph API.

---

## 13. Deploy

### 13.1 Configurar Repositório GitHub

```bash
git init
git add .
git commit -m "feat: initial commit"
gh repo create meu-clone --private --push
```

### 13.2 Conectar ao Vercel

1. Acesse `vercel.com` → New Project → Import do GitHub
2. Selecione o repositório
3. Configure as variáveis de ambiente (todas do `.env.local`)
4. Clique em Deploy

### 13.3 Configurar Deploy Automático

O Vercel detecta automaticamente Next.js e configura CI/CD. Cada push para `main` gera um novo deploy.

### 13.4 Build Command Customizado

Em `package.json`, o build inclui geração do Prisma:
```json
"build": "prisma generate && next build"
```

---

## 14. Testes

### 14.1 Verificar Webhook

Use o botão **Teste** ao lado de cada campo de webhook no Meta for Developers para enviar um evento de teste.

Verifique no Vercel Logs (aba Logs do projeto) se o `POST /api/webhook` chegou.

### 14.2 Testar Comment To DM (modo dev)

1. No Meta for Developers → Funções do app → Testadores → Adicionar conta
2. A conta convidada deve aceitar em `developers.facebook.com`
3. Essa conta agora pode acionar webhooks em modo de desenvolvimento

### 14.3 Testar em Modo Live

1. Publicar o app no Meta for Developers
2. Pedir para um seguidor real comentar em um post
3. Verificar Vercel Logs para confirmar recebimento do webhook
4. Verificar se o seguidor recebeu o DM

### 14.4 Verificar Banco de Dados

Após uma automação ser acionada, verificar a tabela `AutomationEvent`:

```sql
SELECT * FROM "AutomationEvent" ORDER BY "createdAt" DESC LIMIT 10;
```

Eventos esperados:
- `trigger_fired` — automação reconheceu o evento
- `dm_sent` — DM enviado com sucesso
- `follow_gate_blocked` — usuário não seguia (se Follow Gate ativo)
- `follow_gate_passed` — usuário seguia (se Follow Gate ativo)

---

## 15. Troubleshooting

### Webhook não recebe eventos
1. Verificar se o app Meta está em modo **live** (não desenvolvimento)
2. Verificar se os campos estão **assinados** no painel do Messenger API
3. Verificar se a Página está subscrita: `GET /{PAGE_ID}/subscribed_apps?access_token={TOKEN}`
4. Testar manualmente: usar botão "Teste" no Meta for Developers
5. Verificar Vercel Logs em tempo real durante um evento

### DM não é enviado após evento chegar
1. Verificar se a automação está com status `live` (não draft/paused)
2. Verificar se `INSTAGRAM_BUSINESS_ID` está correto
3. Verificar se `FB_PAGE_ACCESS_TOKEN` não expirou
4. Verificar Vercel Logs por erros do automation engine
5. Verificar tabela `AutomationEvent` — se `trigger_fired` existe mas não `dm_sent`, o erro está no envio

### Token expirado (400 error na Settings page)
1. Executar o fluxo OAuth: clicar em "Reconectar com Instagram" na Settings page
2. Ou gerar novo token manualmente (ver seção 7.1) e atualizar `FB_PAGE_ACCESS_TOKEN` nas variáveis do Vercel

### OAuth redireciona para `/login` após autorização
1. Estar logado no app ANTES de iniciar o OAuth
2. O OAuth callback redireciona para `/settings` — o middleware precisa de sessão ativa

### "Invalid platform app" no OAuth do Instagram
- NÃO use `instagram.com/oauth/authorize` para apps Business
- Use `facebook.com/v19.0/dialog/oauth` — ver seção 7.2

### Seguidor não identificado pelo Follow Gate
1. Conta com >200 seguidores: a verificação cobre apenas os primeiros 200
2. Permissão `instagram_manage_comments` pode não estar concedida — error silencioso retorna `false`
3. Verificar se `INSTAGRAM_BUSINESS_ID` está correto

### App rejeitado no App Review da Meta
1. Gravar screencast mostrando EXATAMENTE como cada permissão é usada
2. Ser específico no formulário: "Permission X is used to Y when user Z does W"
3. Ter Política de Privacidade em URL pública
4. Não mencionar concorrentes ou comparar com outras ferramentas
