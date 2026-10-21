export function filterItemsForRoom<T extends Record<string, any>>(items: T[], roomId: string): T[] {
  if (!Array.isArray(items)) return [];
  if (!roomId || roomId === 'all') return items;
  const canonical = String(roomId).trim();
  return items.filter(item => {
    if (!item || typeof item !== 'object') return false;
    const itemRoom = item.channelId || item.userId || item.roomId;
    if (!itemRoom) return true;
    return String(itemRoom).trim() === canonical;
  });
}
