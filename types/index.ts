export type AutomationStatus = 'draft' | 'live' | 'paused'
export type AutomationType =
  | 'comment_to_dm'
  | 'story_reply'
  | 'dm_keyword'
  | 'story_reaction'
  | 'story_mention'

export interface TriggerRule {
  postId?: string         // specific post/reel ID, undefined = any
  keywords?: string[]     // if empty, match any comment
  keywordMatchType?: 'any' | 'all'
  replyToComment?: boolean
  commentReplies?: string[]
  openingDm?: string
  followGateEnabled?: boolean
  followGateDm?: string
  linkButton?: { label: string; url: string }
  followUpDm?: string
}

export interface WebhookCommentEntry {
  id: string
  text: string
  from: { id: string; username?: string }
  media: { id: string }
  timestamp: number
}

export interface WebhookDmEntry {
  sender: { id: string }
  recipient: { id: string }
  timestamp: number
  message: { mid: string; text?: string }
}

export interface WebhookStoryEntry {
  type: 'story_reply' | 'story_reaction' | 'story_mention'
  from: { id: string }
  media: { id: string }
  replyText?: string
  reaction?: string
}

export type WebhookEntry =
  | { kind: 'comment'; data: WebhookCommentEntry }
  | { kind: 'dm'; data: WebhookDmEntry }
  | { kind: 'story'; data: WebhookStoryEntry }
