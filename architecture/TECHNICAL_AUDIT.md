# Auditoria Técnica — OpenChat Visivo

> Revisão completa do estado atual do projeto, riscos identificados e recomendações.
> Data: 2026-06-20

---

## Sumário Executivo

O projeto está funcional e deployado. A arquitetura central (webhook → engine → DM) é sólida. Os maiores riscos são operacionais (token que expira, rate limiting) e de dependência da Meta (App Review para produção plena).

---

## Código Analisado

### `lib/automation-engine.ts` — SAUDÁVEL

**O que faz bem:**
- Separação clara entre tipos de evento (comment, DM, story)
- Follow Gate verifica ANTES de enviar DM (ordem correta)
- Múltiplas automações por evento suportadas
- Log de eventos (`AutomationEvent`) a cada passo
- Keyword matching com suporte a `any` e `all`

**Riscos identificados:**
- `handleCommentEvent` busca TODAS as automações `comment_to_dm` a cada evento. Para muitas automações simultâneas, isso pode ser lento. Aceitável para escala atual.
- `checkIsFollower` pode retornar `false` incorretamente para seguidores além do position 200 (ver ISSUE-001)
- Não há retry em caso de falha no `sendDM`. Se a API do Instagram rejeitar, o evento é perdido.

**Recomendação:** Adicionar log de erro com detalhes quando `sendDM` falhar, para diagnóstico.

---

### `app/api/webhook/route.ts` — SAUDÁVEL

**O que faz bem:**
- Verificação de assinatura HMAC-SHA256 ✅
- Sempre retorna 200 para o Facebook (mesmo em erro) ✅
- Processamento fire-and-forget correto ✅
- Guards contra null (challenge, entries, messaging) ✅
- Evita double-fire DM+referral com if/else if ✅

**Riscos identificados:**
- `processAsync` não tem timeout. Se o processamento travar, a instância serverless fica ativa até o timeout do Vercel (300s padrão). Raro, mas possível.
- Se o Vercel encerrar a instância antes do `processAsync` completar, o evento é perdido silenciosamente.

**Recomendação:** Para eventos críticos, considerar Vercel Queues no futuro como garantia de entrega.

---

### `lib/facebook.ts` — SAUDÁVEL COM RESSALVAS

**O que faz bem:**
- Token e IG_ID via env vars ✅
- Abstração limpa de fbGet/fbPost ✅
- sendDMWithButton adaptado para texto inline (workaround correto) ✅

**Riscos identificados:**
- `TOKEN` e `IG_ID` são carregados no módulo-load (não por request). Se as env vars mudarem, é necessário redeploy.
- Sem tratamento de erros de rate limiting (HTTP 429). Se o limite for atingido, os erros são silenciosos.
- `messaging_type: 'RESPONSE'` hardcoded. Correto para respostas, mas se houver necessidade de proactive messaging no futuro, precisará ser parametrizado.

**Recomendação:** Adicionar log estruturado nos erros de fbPost para facilitar debugging.

---

### `lib/follow-gate.ts` — FUNCIONAL COM LIMITAÇÃO CONHECIDA

**O que faz bem:**
- Cache de 30 minutos no banco de dados evita chamadas excessivas à API
- `upsert` garante que o contato seja criado ou atualizado

**Riscos identificados:**
- Limitação fundamental: só verifica os primeiros 200 seguidores (ver ISSUE-001)
- Se a permissão `instagram_manage_comments` não estiver concedida, retorna `false` para todos — o que bloqueia o Follow Gate mesmo para seguidores reais
- Sem log quando o catch silencia o erro de API

**Recomendação:** Logar o erro quando o catch é acionado, para diagnóstico de permissões.

---

### `app/api/instagram/callback/route.ts` — FUNCIONAL

**O que faz bem:**
- Troca correta de tokens (3 passos) ✅
- Salva token no banco via AppSetting ✅
- Subscreve a Página ao webhook após autorização ✅

**Riscos identificados:**
- Hardcoded Page ID `962368243633567` no find. Se a página mudar, é necessário alterar o código.
- Sem validação do state CSRF no OAuth (ataque CSRF possível, mas risco baixo para uso interno)
- Token salvo como texto plain no banco. Para produção pública, considerar criptografia em repouso.

---

### `prisma/schema.prisma` — SAUDÁVEL

**O que faz bem:**
- `onDelete: Cascade` em AutomationEvent ✅
- AppSetting para tokens OAuth ✅
- Modelo Contact com cache de seguidores ✅

**Riscos identificados:**
- `triggerRule Json` sem validação de schema no banco. Mitigado pelo Zod no frontend, mas mutações diretas no DB podem inserir dados inválidos.
- Sem índice em `AutomationEvent.igUserId` — queries por usuário podem ser lentas com volume.

**Recomendação:** Adicionar índice `@@index([igUserId])` em `AutomationEvent` quando o volume de eventos crescer.

---

## Funcionalidades Inviáveis / Dependentes de Permissões Inexistentes

| Funcionalidade | Status | Motivo |
|---|---|---|
| Follow Gate para >200 seguidores | Parcialmente inviável | API retorna max 200 por página |
| DM com botões visuais | Inviável | Instagram API não suporta button templates |
| DM para usuário sem interação prévia | Inviável sem App Review avançado | Requer acesso avançado a `instagram_business_manage_messages` |
| Automação em posts de outros perfis | Inviável | API não permite |

---

## Riscos de Arquitetura

### RISCO 1 — Token que expira (ALTO)
Page Access Token expira em ~60 dias. Quando expirar, TODAS as automações param de funcionar sem aviso.

**Mitigação:** Implementar check de expiração na Settings page + alerta visual.

### RISCO 2 — Fire-and-forget sem garantia (MÉDIO)
O processamento assíncrono pode ser interrompido se a instância serverless for encerrada antes do completion.

**Mitigação:** Para o volume atual, aceitável. Para produção de maior escala: Vercel Queues.

### RISCO 3 — Sem retry em falhas de API (MÉDIO)
Se `sendDM` falhar (rate limit, token inválido), o evento é perdido.

**Mitigação:** Adicionar log de erro detalhado. Retry pode causar DMs duplicadas — avaliar com cuidado.

### RISCO 4 — Dependência do App Review da Meta (ALTO)
Para funcionar com 100% dos usuários sem restrições, é necessário passar pelo App Review. A Meta pode reprovar o app ou exigir mudanças significativas.

**Mitigação:** Submeter para review assim que possível. Documentar claramente o caso de uso.

---

## Código Desnecessário / Morto

| Local | Observação |
|---|---|
| `lib/queue.ts` | BullMQ configurado mas não usado no fluxo principal. Manter como infraestrutura caso necessário no futuro, mas pode ser removido para simplificar. |
| `instrumentation.ts` | Inicia worker BullMQ que não processa nada em produção. Pode ser removido ou esvaziado. |

---

## Gargalos Futuros

| Cenário | Gargalo | Solução |
|---|---|---|
| >100 automações ativas | Query sem índice em `triggerRule` | Migrar para índices específicos por tipo |
| >1000 DMs/hora | Rate limiting da Graph API | Solicitar aumento de cota + implementar throttle |
| >200 seguidores na conta | Follow Gate impreciso | Implementar paginação ou endpoint alternativo |
| Token expirado em produção | Downtime silencioso | Alerta proativo de expiração |

---

## Conclusão

O projeto está em estado **produção-ready para uso interno** (conta única, volume moderado). Os problemas críticos identificados na construção foram todos corrigidos. Os riscos remanescentes são operacionais e podem ser mitigados progressivamente sem reescrever a arquitetura.

**Próximas ações recomendadas (por prioridade):**
1. Validar que webhooks chegam para usuários não-testadores em modo live
2. Submeter App Review para `pages_messaging` e `instagram_manage_messages`
3. Implementar alerta de expiração do token
4. Adicionar log de erro detalhado em `sendDM` e `checkIsFollower`
