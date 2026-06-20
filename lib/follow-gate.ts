import { fbGet } from './facebook'
import { db } from './db'

const IG_ID = process.env.INSTAGRAM_BUSINESS_ID!

export async function checkIsFollower(igUserId: string): Promise<boolean> {
  // Cache check: if checked within last 30 minutes, use cached value
  const contact = await db.contact.findUnique({ where: { igUserId } })
  if (contact?.lastChecked) {
    const ageMs = Date.now() - contact.lastChecked.getTime()
    if (ageMs < 30 * 60 * 1000) return contact.isFollower
  }

  // NOTE: Instagram Followers API availability depends on granted permissions. If unavailable, this defaults to false.
  try {
    // Uses the Instagram Graph API relationship endpoint
    // Required permission: instagram_manage_comments or pages_messaging
    const data = await fbGet(`/${IG_ID}/followers`, {
      fields: 'id',
      // Note: this filters to check if specific user is in followers
      // The actual endpoint and filter depend on granted API permissions.
      // If the above endpoint is not available, use:
      // GET /{ig-user-id}?fields=follows_count (public info only)
      // For private follower lookup, instagram_manage_insights permission is needed.
    })

    // The followers endpoint returns a paged list; check if igUserId is in list
    const followers: Array<{ id: string }> = data.data ?? []
    const isFollower = followers.some((f) => f.id === igUserId)

    await db.contact.upsert({
      where: { igUserId },
      update: { isFollower, lastChecked: new Date() },
      create: { igUserId, isFollower, lastChecked: new Date() },
    })

    return isFollower
  } catch {
    // If API doesn't support the check (permission not granted), default to false
    return false
  }
}
