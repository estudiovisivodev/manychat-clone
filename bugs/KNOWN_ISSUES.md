# Known Issues — OpenChat Visivo

Registro de todos os problemas encontrados, causas identificadas, soluções aplicadas e prevenção futura.

---

## BUG-001 — BullMQ worker não processa jobs no Vercel

### Problema
Jobs adicionados à fila BullMQ nunca eram processados em produção. O webhook recebia eventos, adicionava à fila, mas o worker nunca executava a automação. Logs do Vercel mostravam `[Worker] started` mas nenhum processamento subsequente.

### Causa
Vercel é uma plataforma serverless. Cada request cria uma nova instância da função que é destruída após o response. O worker BullMQ iniciado em `instrumentation.ts` vive apenas enquanto a instância serverless estiver ativa — que é por milissegundos após a resposta do webhook. Não existe processo persistente no Vercel para consumir a fila.

### Solução
Removido o uso de fila no fluxo principal. O webhook agora chama `processWebhookJob()` diretamente via import dinâmico + fire-and-forget:

```typescript
function processAsync(entry: WebhookEntry) {
  import('@/lib/automation-engine')
    .then(({ processWebhookJob }) => processWebhookJob(entry))
    .catch((err) => console.error('[Webhook] processing error:', err))
}
```

O processamento ocorre na mesma instância serverless enquanto a resposta já foi enviada ao Facebook. Como o Facebook aguarda resposta 200 em <5s, e o processamento de DMs costuma levar 1-3s, isso funciona na prática.

### Prevenção
- Se houver necessidade de processamento assíncrono garantido no futuro: usar **Vercel Queues** (produto nativo do Vercel) ou **Inngest** (queue gerenciada)
- Nunca iniciar workers de longa duração em `instrumentation.ts` para produção no Vercel

---

## BUG-002 — Token de acesso expirado na Settings page (400 error)

### Problema
Settings page mostrava status "Erro" na verificação do webhook. API retornava 400.

### Causa
O Page Access Token configurado em `FB_PAGE_ACCESS_TOKEN` era um token de curta duração (~1 hora) gerado diretamente no Graph API Explorer. Estava expirado.

### Solução
Processo de 3 passos para gerar token de longa duração (~60 dias):
1. Gerar token curto no Graph API Explorer com as permissões necessárias
2. Trocar por token longo: `GET /oauth/access_token?grant_type=fb_exchange_token&...`
3. Obter Page Token: `GET /me/accounts` → encontrar página pelo ID → usar `access_token` da página

Esse processo agora está automatizado no OAuth flow (`/api/instagram/callback`).

### Prevenção
- Tokens têm validade de ~60 dias — renovar antes do vencimento
- O callback OAuth já salva o token no banco (`AppSetting`) e pode ser executado novamente quando expirar
- Adicionar monitoramento: verificar data de expiração do token periodicamente

---

## BUG-003 — Instagram Platform OAuth rejeitado com "Invalid platform app"

### Problema
Ao tentar conectar via `instagram.com/oauth/authorize`, o Meta retornava erro: "Solicitação inválida: Invalid platform app".

### Causa
O endpoint `instagram.com/oauth/authorize` é destinado apenas a apps do tipo **Consumer** (apps pessoais). O OpenChat é um app do tipo **Business** (criado para gerenciar páginas e contas Business). Apps Business são rejeitados por esse endpoint.

### Solução
Substituir o endpoint de OAuth:
- **Antes:** `https://instagram.com/oauth/authorize`
- **Depois:** `https://www.facebook.com/v19.0/dialog/oauth`

O Facebook Login OAuth aceita apps Business e concede as mesmas permissões de Instagram (`instagram_manage_messages`, `instagram_manage_comments`, etc.).

### Prevenção
- Para qualquer app que gerencia Pages ou Instagram Business: sempre usar Facebook Login OAuth
- Instagram Platform OAuth é apenas para apps que acessam dados pessoais do usuário que faz login

---

## BUG-004 — Webhook não recebia eventos de contas não-testadoras

### Problema
Após configurar tudo corretamente, comentários e DMs de contas normais não chegavam ao webhook. Apenas eventos de contas com função no app (admin/developer) geravam logs no Vercel.

### Causa
O app estava em **modo de desenvolvimento**. Em modo de desenvolvimento, a Meta envia eventos de webhook APENAS para contas com papel no app (admin, developer, tester). Qualquer outra conta é ignorada silenciosamente.

### Solução
Publicar o app: Meta for Developers → OpenChat Visivo → Publicar → modo **Ao vivo**.

App agora aparece como "Publicado" no dashboard do Meta.

### Prevenção
- Sempre verificar o modo do app ao depurar ausência de webhooks
- Em desenvolvimento, adicionar conta de teste via Funções do app → Testadores para validar o fluxo antes de publicar

---

## BUG-005 — Page subscription falhava com permissões insuficientes

### Problema
`POST /{page-id}/subscribed_apps` retornava erro de permissões ao tentar subscrever a Página ao webhook de mensagens.

### Causa
O token não tinha as permissões `pages_manage_metadata` e `pages_messaging`. Essas permissões não estavam disponíveis no app porque o produto **Messenger from Meta** não havia sido adicionado.

### Solução
1. Meta for Developers → OpenChat Visivo → Adicionar casos de uso → **Messenger from Meta**
2. Após adicionar o produto Messenger, as permissões `pages_manage_metadata` e `pages_messaging` apareceram na lista de permissões disponíveis
3. Regenerar token incluindo essas permissões

### Prevenção
- Antes de tentar subscrever uma Página ao webhook, verificar se o produto Messenger está adicionado ao app
- Cheklist de permissões obrigatórias para webhooks de mensagens:
  - `pages_messaging` — para receber e enviar mensagens
  - `pages_manage_metadata` — para subscrever a Página ao webhook

---

## BUG-006 — DMs com botão rejeitadas pela API do Instagram

### Problema
Ao tentar enviar DM com botão (link button), a API retornava erro. O template de botões não era aceito.

### Causa
O Instagram Messaging API **não suporta** o tipo de template `button` para DMs. Esse recurso existe no Messenger (Facebook) mas não foi implementado para Instagram.

### Solução
Enviar o link diretamente no texto da mensagem, formatado como:

```
{message}

{buttonLabel}: {url}
```

### Prevenção
- Não implementar templates de botões para Instagram DMs — não existe suporte
- Documentar isso claramente no UI para o usuário final

---

## BUG-007 — Follow Gate enviava DM antes de verificar seguidor

### Problema
Quando Follow Gate estava habilitado e o usuário não seguia o perfil, o sistema enviava o DM de bloqueio MAS também continuava executando o fluxo e enviando o DM principal.

### Causa
Ordem de execução incorreta em `executeDmFlow`: o `openingDm` era enviado antes da verificação de seguidor.

### Solução
Reordenar: verificação de Follow Gate → `return` se não for seguidor → `openingDm` apenas se passou.

### Prevenção
- Follow Gate deve sempre ser a primeira verificação em qualquer fluxo de automação
- Adicionar teste de integração que confirma o `return` após bloqueio

---

## BUG-008 — Webhook retornava 500 e Facebook parava de enviar eventos

### Problema
Erros não tratados no handler do webhook retornavam status 500. O Facebook interpreta qualquer resposta não-200 como falha e pode pausar a entrega de eventos.

### Causa
Ausência de try/catch global no handler POST do webhook.

### Solução
Envolto todo o body do POST em try/catch. Em caso de qualquer erro, retorna 200 mesmo assim:

```typescript
} catch {
  return NextResponse.json({ status: 'ok' }) // sempre 200 para o Facebook
}
```

### Prevenção
- Webhook handlers para o Facebook DEVEM sempre retornar 200, mesmo em caso de erro interno
- Processar os eventos de forma assíncrona para não bloquear a resposta

---

## ISSUE-001 — Follow Gate não escala para contas com >200 seguidores

### Problema (em aberto)
A verificação de seguidores usa `GET /{ig-id}/followers?limit=200`. Para contas com mais de 200 seguidores, apenas a primeira página é verificada. Um seguidor na segunda página será incorretamente identificado como não-seguidor.

### Status
Não corrigido. Para a fase atual do Estúdio Visivo (conta pequena), não é crítico.

### Solução futura
- Implementar paginação completa da lista de seguidores (pode ser lento para contas grandes)
- Alternativa: usar endpoint específico `/me/following/{user-id}` se disponível com as permissões concedidas
- Alternativa: cache de seguidores atualizado periodicamente (batch job)

---

## ISSUE-002 — Page Access Token expira em ~60 dias

### Problema (em aberto)
O token de acesso da Página tem validade de aproximadamente 60 dias. Após expirar, as automações param de funcionar silenciosamente.

### Status
Não há renovação automática implementada.

### Solução futura
- Adicionar verificação de expiração do token na Settings page
- Implementar alertas quando o token está próximo do vencimento (7 dias antes)
- O fluxo OAuth em `/api/instagram/callback` já renova o token — basta executá-lo novamente
