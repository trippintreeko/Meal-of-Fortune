/** Strip the trailing "_" + 6-char unique code from usernames for display (e.g. "john_f7ec21" → "john"). */
export function getDisplayUsername (username: string | null | undefined): string {
  if (username == null || typeof username !== 'string') return ''
  return username.replace(/_[a-fA-F0-9]{6}$/, '').trim() || username
}
