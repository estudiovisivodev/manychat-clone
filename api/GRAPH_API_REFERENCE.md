# Graph API — Referência Rápida

> Endpoints usados pelo OpenChat Visivo. Todos via `https://graph.facebook.com/v19.0`.

---

## Autenticação

Todos os requests usam `?access_token={TOKEN}` ou header `Authorization: Bearer {TOKEN}`.

### Tipos de Token

| Tipo | Validade | Uso |
|---|---|---|
| Short-lived User Token | 1 hora | Apenas para trocar por long-lived |
| Long-lived User Token | ~60 dias | Trocar por Page Token |
| Page Access Token | ~60 dias | Enviar DMs, subscrever webhook |
| App Token | Indefinido | App-level subscriptions |

### Trocar por Long-lived Token
```
GET /oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={APP_ID}
  &client_secret={APP_SECRET}
  &fb_exchange_token={SHORT_LIVED_TOKEN}
```

### Obter Page Token
```
GET /me/accounts
  ?access_token={LONG_LIVED_TOKEN}
```
Retorna array de páginas. Encontrar pelo `id` e usar o `access_token` da página.

---

## Mensagens

### Enviar DM de Texto
```
POST /{INSTAGRAM_BUSINESS_ID}/messages
Body: {
  "recipient": { "id": "{IG_USER_ID}" },
  "message": { "text": "texto da mensagem" },
  "messaging_type": "RESPONSE"
}
```

> `messaging_type: RESPONSE` é obrigatório para respostas a interações. Sem isso, a API retorna erro.

### Enviar DM com Link (workaround)
```
// Instagram não suporta button templates — enviar URL no texto
"message": { "text": "Aqui está o link:\n\nAcessar: https://..." }
```

---

## Comentários

### Responder a Comentário
```
POST /{COMMENT_ID}/replies
  ?access_token={PAGE_TOKEN}
Body: { "message": "texto da resposta" }
```

### Curtir Comentário
```
POST /{COMMENT_ID}/likes
  ?access_token={PAGE_TOKEN}
```

---

## Instagram Business

### Listar Posts/Mídias Recentes
```
GET /{IG_ID}/media
  ?fields=id,media_type,thumbnail_url,timestamp
  &limit=20
  &access_token={PAGE_TOKEN}
```

### Listar Seguidores (max 200)
```
GET /{IG_ID}/followers
  ?fields=id
  &limit=200
  &access_token={PAGE_TOKEN}
```

### Descobrir Instagram Business ID de uma Página
```
GET /{PAGE_ID}
  ?fields=instagram_business_account
  &access_token={PAGE_TOKEN}
```
Retorna: `{ "instagram_business_account": { "id": "..." } }`

---

## Webhooks

### Criar Subscrição no Nível do App
```
POST /{APP_ID}/subscriptions
  ?object=instagram
  &callback_url=https://SEU_DOMINIO/api/webhook
  &fields=comments,messages,messaging_postbacks,messaging_referrals
  &verify_token={VERIFY_TOKEN}
  &access_token={APP_ID}|{APP_SECRET}
```

### Verificar Subscrições Ativas
```
GET /{APP_ID}/subscriptions
  ?access_token={APP_ID}|{APP_SECRET}
```

### Subscrever Página ao Webhook
```
POST /{PAGE_ID}/subscribed_apps
  ?subscribed_fields=messages,messaging_postbacks,mention,messaging_referrals
  &access_token={PAGE_TOKEN}
```

### Verificar Subscrição da Página
```
GET /{PAGE_ID}/subscribed_apps
  ?access_token={PAGE_TOKEN}
```

---

## IDs do Projeto

| Recurso | ID |
|---|---|
| App (OpenChat Visivo) | `997136759849459` |
| Página Facebook (Estúdio Visivo) | `962368243633567` |
| Instagram Business (estudiovisivo) | `533913673134517` |
| Webhook URL | `https://visivochatsource.vercel.app/api/webhook` |

---

## Estrutura de Eventos Recebidos no Webhook

### Comentário em Post
```json
{
  "object": "instagram",
  "entry": [{
    "changes": [{
      "field": "comments",
      "value": {
        "id": "COMMENT_ID",
        "text": "texto do comentário",
        "from": { "id": "USER_IG_ID", "username": "usuario" },
        "media": { "id": "POST_ID" },
        "timestamp": 1234567890
      }
    }]
  }]
}
```

### DM Recebida
```json
{
  "object": "instagram",
  "entry": [{
    "messaging": [{
      "sender": { "id": "USER_IG_ID" },
      "recipient": { "id": "PAGE_IG_ID" },
      "timestamp": 1234567890,
      "message": { "mid": "MSG_ID", "text": "texto da mensagem" }
    }]
  }]
}
```

### Story Reply
```json
{
  "object": "instagram",
  "entry": [{
    "messaging": [{
      "sender": { "id": "USER_IG_ID" },
      "message": { "text": "texto da resposta" },
      "referral": { "ref": "STORY_ID", "source": "STORY" }
    }]
  }]
}
```
