const POST_ACTIVITY = new Set(['like', 'comment', 'reaction']);

export function notificationTarget(notification) {
  if (notification.type === 'monthly_recap') {
    if (!notification.ownerId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(notification.month || '')) return null;
    return `/profile/${encodeURIComponent(notification.ownerId)}?recap=${notification.month}&reel=1#monthly-highlights-title`;
  }
  const postId = notification.postId || notification.post_id;
  if (postId) return `/?post=${encodeURIComponent(postId)}`;
  // Deleted or legacy post activity must never open an unrelated profile.
  if (POST_ACTIVITY.has(notification.type)) return null;
  return notification.actorId ? `/profile/${encodeURIComponent(notification.actorId)}` : null;
}
