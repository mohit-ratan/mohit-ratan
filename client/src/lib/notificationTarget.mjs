const POST_ACTIVITY = new Set(['like', 'comment', 'reaction']);

export function notificationTarget(notification) {
  const postId = notification.postId || notification.post_id;
  if (postId) return `/?post=${encodeURIComponent(postId)}`;
  // Deleted or legacy post activity must never open an unrelated profile.
  if (POST_ACTIVITY.has(notification.type)) return null;
  return notification.actorId ? `/profile/${encodeURIComponent(notification.actorId)}` : null;
}
