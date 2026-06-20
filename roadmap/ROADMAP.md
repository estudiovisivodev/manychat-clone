# Roadmap — OpenChat Visivo

> Estado atual e próximos passos do produto.
> Última atualização: 2026-06-20

---

## Status Atual

**Versão:** 0.5.0  
**Deploy:** https://visivochatsource.vercel.app  
**App Meta:** Publicado (modo live)  
**Webhooks:** Configurados e verificados  

---

## Concluído

- [x] Scaffold do projeto (Next.js 16 + Prisma + Tailwind)
- [x] Sistema de auth por senha (JWT httpOnly)
- [x] Webhook handler com verificação HMAC
- [x] Automation engine (comment, DM keyword, story)
- [x] Follow Gate
- [x] Easy Builder (editor de automações)
- [x] Dashboard com métricas
- [x] Visual Flow Builder
- [x] Settings + OAuth de reconexão
- [x] Página de Política de Privacidade
- [x] Deploy no Vercel
- [x] App Meta publicado em modo live

---

## Em Validação

- [ ] Confirmar que webhooks chegam de usuários não-testadores em modo live
- [ ] Confirmar que DMs são enviadas com sucesso após evento de comentário

---

## Próximas Tarefas (Prioridade Alta)

- [ ] **App Review da Meta**: submeter para aprovação de `pages_messaging` e `instagram_manage_messages`
  - Gravar screencast do fluxo funcionando
  - Formulário explicando o caso de uso de cada permissão

- [ ] **Alerta de expiração de token**: Settings page deve mostrar quando o token expira e enviar alerta visual 7 dias antes

- [ ] **Log de erros de DM**: quando `sendDM()` falha, registrar o erro em `AutomationEvent` com detalhes

---

## Melhorias Futuras (Prioridade Média)

- [ ] Paginação no Follow Gate (>200 seguidores)
- [ ] Retry automático em falha de DM (com deduplicação)
- [ ] Filtro por horário de disparo (automação só ativa em horário configurado)
- [ ] Limite de DMs por usuário (evitar spam para a mesma pessoa)
- [ ] Métricas avançadas (taxa de conversão, usuários únicos, etc.)
- [ ] Exportação de dados (CSV de eventos)

---

## Não Fazer (Fora do Escopo)

- Multi-tenant (múltiplas contas gerenciadas)
- Broadcast / Mass DM (proibido pela Meta)
- Botões visuais em DMs (API não suporta)
- Automação de stories (publicar conteúdo)
- Integração com outras redes sociais
