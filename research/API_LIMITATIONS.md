# Limitações Reais da API — OpenChat Visivo

> Documento baseado em comportamento real observado durante o desenvolvimento e testes.
> Atualizado: 2026-06-20

---

## O que a API PERMITE fazer

### Instagram Messaging API (via Messenger from Meta)
- Enviar DM de texto para usuário que comentou em um post (dentro da janela de 24h)
- Enviar DM de texto para usuário que mandou DM primeiro
- Responder a um comentário publicamente (reply)
- Curtir um comentário
- Receber webhook de DMs recebidas
- Receber webhook de comentários em posts (campo `comments`)
- Receber webhook de story replies, reactions e mentions
- Enviar mensagens de texto simples (até ~2000 caracteres)
- Enviar URL inline no texto da mensagem

### Facebook Graph API
- Listar posts/mídias recentes do Instagram Business
- Verificar lista de seguidores (com limitações)
- Gerenciar subscrições de webhook por Página
- Trocar tokens (short-lived → long-lived → page token)

---

## O que a API NÃO PERMITE fazer

### Botões e Templates
- **Botões em DMs do Instagram**: API rejeita o tipo `template` com `buttons`. Isso existe no Messenger (Facebook) mas NÃO no Instagram.
- **Quick Replies**: Também não suportado para Instagram DMs
- **Carrosséis**: Não suportado para Instagram DMs
- **Imagens em DMs via API**: Tecnicamente possível mas requer upload separado e permissões adicionais

### Envio de Mensagens
- **Mensagem não-solicitada (cold DM)**: Não é possível enviar DM para um usuário que nunca interagiu com a conta. Exige que o usuário tenha iniciado uma conversa primeiro OU que haja uma janela de 24h aberta.
- **Janela de 24h**: Após o último contato do usuário, a conta tem 24h para responder. Após esse período, apenas Mensagens Patrocinadas (pagas) podem ser enviadas.
- **Broadcast / Mass DM**: Proibido pelos Termos de Serviço da Meta. Qualquer uso percebido como spam pode resultar em ban da conta.

### Seguidores
- **Lista completa de seguidores**: A API retorna no máximo 200 por página. Sem paginação automática disponível gratuitamente para contas com muitos seguidores.
- **Verificação individual de seguidor**: Não existe endpoint direto `GET /is-follower/{user-id}` — é necessário varrer a lista.

### Comentários
- **Deletar comentário de terceiros**: Não permitido via API
- **Ocultar comentário**: Possível com permissão `instagram_manage_comments`
- **Comentário em post de outro perfil**: Não suportado

---

## O que depende de Aprovação da Meta (App Review)

### Acesso Padrão vs. Acesso Avançado

| Permissão | Acesso Padrão | Acesso Avançado |
|---|---|---|
| `instagram_manage_messages` | Apenas contas com papel no app | Qualquer usuário |
| `instagram_manage_comments` | Apenas contas com papel no app | Qualquer usuário |
| `pages_messaging` | Dev mode: apenas testadores; Live mode: qualquer usuário | Sem restrições adicionais |

**Para o Acesso Avançado é necessário:**
1. Submeter o app para revisão pela Meta
2. Gravar screencast demonstrando o uso das permissões
3. Fornecer URL de Política de Privacidade
4. Aprovação pode levar 5-30 dias úteis
5. Meta pode rejeitar se o caso de uso não for claro

### Status Atual
- App em modo **live (publicado)** ✅
- `pages_messaging`: acesso padrão — qualquer usuário pode acionar eventos em modo live
- `instagram_manage_comments`: acesso padrão — verificar se eventos de comentários chegam para todos os usuários em modo live
- App Review não submetido ainda

---

## O que depende de Permissões Avançadas

### `instagram_business_manage_messages`
- Versão avançada de `instagram_manage_messages`
- Permite enviar mensagens proativas (sem janela de 24h)
- Requer App Review + caso de uso específico aprovado

### `instagram_business_manage_comments`
- Versão avançada de `instagram_manage_comments`
- Necessário para automações de alto volume
- Requer App Review

### `pages_read_user_content`
- Para ler comentários em qualidade de moderação
- Requer App Review

---

## O que NÃO pode ser implementado

| Funcionalidade | Motivo |
|---|---|
| Envio de DM em massa (blast) | Proibido pelos Termos de Uso da Meta. Resultaria em ban da conta. |
| DM para qualquer usuário sem interação prévia | Requer Mensagem Patrocinada (paga via Ads Manager) |
| Capturar stories de outros usuários | Sem acesso via API |
| Automação de stories (criar/publicar) | Requer permissão específica de publicação, não inclusa no escopo |
| Respostas em comentários de posts patrocinados (ads) | Webhook não entrega esses eventos |
| Webhooks para DMs do Facebook Messenger pessoal | Requer app do tipo Consumer, não Business |
| Acesso a analytics avançados (reach, impressions) | Requer permissão `instagram_basic` + conta Business vinculada |

---

## Limitações de Rate Limiting

### Graph API
- **200 chamadas por hora** por token de usuário (padrão)
- **Calls por segundo**: não documentado oficialmente, mas ~50/s é o limite observado
- Para automações de alto volume (>1000 DMs/hora): solicitar aumento de limite via Meta

### Webhooks
- Meta entrega eventos em ordem aproximada, não garantida
- Em caso de falha do servidor (response não-200), Meta pode tentar reenviar
- Se o webhook retornar erro repetidamente, Meta pode pausar a entrega

---

## Comportamento Observado vs. Documentado

| Comportamento | Esperado (Docs) | Observado |
|---|---|---|
| Modo dev → webhook fires | Apenas testadores | Confirmado |
| Modo live → webhook fires | Qualquer usuário | A validar em produção |
| Button templates em DMs Instagram | Suportado (docs antigas) | **Rejeitado pela API** |
| Instagram Platform OAuth | Disponível para todos | Rejeita apps Business |
| Token de página validade | Não expira | **Expira em ~60 dias** |
| Follow check endpoint | Disponível | Funciona com `limit: 200` |
