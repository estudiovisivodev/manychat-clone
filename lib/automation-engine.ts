import { db } from './db'
import { sendDM, sendDMWithButton, sendPrivateReply, replyToComment, likeComment } from './facebook'
import { checkIsFollower } from './follow-gate'
import type { TriggerRule, WebhookEntry } from '@/types'

export async function processWebhookJob(entry: WebhookEntry) {
  console.log('[Engine] processing', entry.kind, JSON.stringify(entry.data).slice(0, 200))
  if (entry.kind === 'comment') {
    await handleCommentEvent(entry.data)
  } else if (entry.kind === 'dm') {
    await handleDmEvent(entry.data)
  } else if (entry.kind === 'story') {
    await handleStoryEvent(entry.data)
  }
}

async function handleCommentEvent(data: {
  id: string
  text: string
  from: { id: string; username?: string }
  media: { id: string }
  timestamp: number
}) {
  const automations = await db.automation.findMany({
    where: { status: 'live', type: 'comment_to_dm' },
  })
  console.log(`[Engine] comment from @${data.from.username ?? data.from.id}: "${data.text}" — ${automations.length} live automation(s)`)

  for (const automation of automations) {
    const rule = automation.triggerRule as unknown as TriggerRule

    // Check post filter
    if (rule.postId && rule.postId !== data.media.id) {
      console.log(`[Engine] automation ${automation.id}: skipped — post filter mismatch`)
      continue
    }

    // Check keyword filter
    if (rule.keywords && rule.keywords.length > 0) {
      const commentLower = data.text.toLowerCase()
      const matched =
        rule.keywordMatchType === 'all'
          ? rule.keywords.every((kw) => commentLower.includes(kw.toLowerCase()))
          : rule.keywords.some((kw) => commentLower.includes(kw.toLowerCase()))
      if (!matched) {
        console.log(`[Engine] automation ${automation.id}: skipped — keyword mismatch`)
        continue
      }
    }

    // Reply to comment
    if (rule.replyToComment && rule.commentReplies && rule.commentReplies.length > 0) {
      const reply = rule.commentReplies[Math.floor(Math.random() * rule.commentReplies.length)]
      await replyToComment(data.id, reply).catch(() => null)
      await likeComment(data.id).catch(() => null)
    }

    await db.automationEvent.create({
      data: { automationId: automation.id, eventType: 'trigger_fired', igUserId: data.from.id },
    })
    console.log(`[Engine] automation ${automation.id}: trigger_fired — sending DM to ${data.from.id}`)

    await executeDmFlow(automation.id, data.from.id, rule, data.id)
  }
}

async function executeDmFlow(automationId: string, igUserId: string, rule: TriggerRule, commentId?: string) {
  // Follow Gate — must be checked BEFORE sending the opening DM
  if (rule.followGateEnabled) {
    const isFollower = await checkIsFollower(igUserId)
    if (!isFollower) {
      const msg = rule.followGateDm || 'Para receber o link, siga nosso perfil primeiro! 😊'
      await (commentId ? sendPrivateReply(commentId, msg) : sendDM(igUserId, msg))
      await db.automationEvent.create({
        data: { automationId, eventType: 'follow_gate_blocked', igUserId },
      })
      return // stop — don't send the opening DM or link
    }
    await db.automationEvent.create({
      data: { automationId, eventType: 'follow_gate_passed', igUserId },
    })
  }

  // Send opening DM (only after passing the gate, or if gate is disabled)
  if (rule.openingDm) {
    console.log(`[Engine] sending DM to ${igUserId}: "${rule.openingDm.slice(0, 50)}"`)
    await (commentId ? sendPrivateReply(commentId, rule.openingDm) : sendDM(igUserId, rule.openingDm))
    await db.automationEvent.create({
      data: { automationId, eventType: 'dm_sent', igUserId },
    })
    console.log(`[Engine] DM sent OK to ${igUserId}`)
  }

  // Send link button DM
  if (rule.linkButton) {
    await sendDMWithButton(igUserId, '📎 Aqui está o link:', rule.linkButton.label, rule.linkButton.url)
    await db.automationEvent.create({
      data: { automationId, eventType: 'dm_sent', igUserId },
    })
  }

  // FIX 9: follow-up DM with dm_sent log
  if (rule.followUpDm) {
    await sendDM(igUserId, rule.followUpDm)
    await db.automationEvent.create({
      data: { automationId, eventType: 'dm_sent', igUserId },
    })
  }
}

async function handleDmEvent(data: {
  sender: { id: string }
  recipient: { id: string }
  timestamp: number
  message: { mid: string; text?: string }
}) {
  const automations = await db.automation.findMany({
    where: { status: 'live', type: 'dm_keyword' },
  })

  for (const automation of automations) {
    const rule = automation.triggerRule as unknown as TriggerRule
    if (!data.message.text) continue

    // FIX 8: respect keywordMatchType
    if (rule.keywords && rule.keywords.length > 0) {
      const msgLower = data.message.text.toLowerCase()
      const matched =
        rule.keywordMatchType === 'all'
          ? (rule.keywords ?? []).every((kw) => msgLower.includes(kw.toLowerCase()))
          : (rule.keywords ?? []).some((kw) => msgLower.includes(kw.toLowerCase()))
      if (!matched) continue
    }

    // FIX 7: log trigger_fired before executing flow
    await db.automationEvent.create({
      data: { automationId: automation.id, eventType: 'trigger_fired', igUserId: data.sender.id },
    })

    await executeDmFlow(automation.id, data.sender.id, rule)
  }
}

// FIX 5: safe typeMap with early return on unknown type
const automationTypeMap: Record<string, string> = {
  story_reply: 'story_reply',
  story_reaction: 'story_reaction',
  story_mention: 'story_mention',
}

async function handleStoryEvent(data: {
  type: 'story_reply' | 'story_reaction' | 'story_mention'
  from: { id: string }
  media: { id: string }
}) {
  const automationType = automationTypeMap[data.type]
  if (!automationType) return // unknown type — do nothing safely

  const automations = await db.automation.findMany({
    where: { status: 'live', type: automationType as 'story_reply' | 'story_reaction' | 'story_mention' },
  })

  for (const automation of automations) {
    const rule = automation.triggerRule as unknown as TriggerRule
    await db.automationEvent.create({
      data: { automationId: automation.id, eventType: 'trigger_fired', igUserId: data.from.id },
    })
    await executeDmFlow(automation.id, data.from.id, rule)
  }
}
