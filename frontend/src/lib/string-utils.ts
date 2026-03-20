/**
 * Returns up to 2 initials from a display name.
 * Uses first and last word initials when available.
 * Falls back to first two characters for single-word names.
 */
export function getInitials(name: string): string {
  if (!name || !name.trim()) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
