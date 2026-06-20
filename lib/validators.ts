import { z } from 'zod'

export const TriggerRuleSchema = z.object({
  postId: z.string().optional(),
  keywords: z.array(z.string()).optional().default([]),
  keywordMatchType: z.enum(['any', 'all']).optional().default('any'),
  replyToComment: z.boolean().optional().default(false),
  commentReplies: z.array(z.string()).optional().default([]),
  openingDm: z.string().optional().default(''),
  followGateEnabled: z.boolean().optional().default(false),
  followGateDm: z.string().optional().default('Para receber o link, siga nosso perfil primeiro! 😊'),
  linkButton: z.object({ label: z.string(), url: z.string().url() }).optional(),
  followUpDm: z.string().optional().default(''),
})

export const CreateAutomationSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['comment_to_dm', 'story_reply', 'dm_keyword', 'story_reaction', 'story_mention']),
  triggerRule: TriggerRuleSchema,
  flowId: z.string().optional(),
})

export const CreateFlowSchema = z.object({
  name: z.string().min(1).max(100),
})

export const FlowNodeSchema = z.object({
  type: z.enum(['send_message', 'wait', 'condition', 'end', 'redirect']),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()),
  edges: z.array(z.object({
    source: z.string(),
    target: z.string(),
    label: z.string().optional(),
  })).default([]),
})
