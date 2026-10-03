/**
 * roomIsolation.ts
 * Enterprise-grade multi-tier validation checks for strict room isolation.
 * Prevents any rosters, teams, or players from leaking across rooms.
 */

export interface RoomCheckResult {
  allowed: boolean;
  reason?: string;
}

export function isItemInRoom(item: any, roomId: string): boolean {
  if (!item) return false;
  const canonical = (roomId || '').trim().toLowerCase();
  if (!canonical || canonical === 'guest') return true;

  const itemId = String(item.id || '').toLowerCase();
  const itemTeamId = String(item.teamId || '').toLowerCase();
  const itemChannelId = String(item.channelId || '').toLowerCase();
  const itemUserId = String(item.userId || '').toLowerCase();

  // CHECK 1: Explicit Room ID Prefix Guards
  if (itemId.startsWith('t_channel_airy_') || itemId.startsWith('p_channel_airy_') || itemId.includes('_airy_')) {
    if (canonical !== 'channel_airy' && !canonical.includes('airy')) return false;
  }
  if (itemId.startsWith('t_channel_simu_') || itemId.startsWith('p_channel_simu_') || itemId.includes('_simu_')) {
    if (canonical !== 'channel_simu' && !canonical.includes('simu')) return false;
  }
  if (itemId.startsWith('t_channel_bamep_cs2_') || itemId.startsWith('p_channel_bamep_cs2_') || itemId.includes('_bamep_cs2_')) {
    if (canonical !== 'channel_bamep_cs2' && !canonical.includes('bamep') && !canonical.includes('zeixst')) return false;
  }

  // CHECK 2: Team Roster Guard for Players
  if (itemTeamId.startsWith('t_channel_airy_')) {
    if (canonical !== 'channel_airy' && !canonical.includes('airy')) return false;
  }
  if (itemTeamId.startsWith('t_channel_simu_')) {
    if (canonical !== 'channel_simu' && !canonical.includes('simu')) return false;
  }
  if (itemTeamId.startsWith('t_channel_bamep_cs2_')) {
    if (canonical !== 'channel_bamep_cs2' && !canonical.includes('bamep') && !canonical.includes('zeixst')) return false;
  }

  // CHECK 3: Defense against known other rooms
  const isTargetBamep = canonical === 'channel_bamep_cs2' || canonical.includes('bamep') || canonical.includes('zeixst');
  const isTargetAiry = canonical === 'channel_airy' || canonical.includes('airy');
  const isTargetSimu = canonical === 'channel_simu' || canonical.includes('simu');

  if (isTargetBamep) {
    if (itemChannelId === 'channel_airy' || itemUserId === 'channel_airy' || itemChannelId.includes('airy')) return false;
    if (itemChannelId === 'channel_simu' || itemUserId === 'channel_simu' || itemChannelId.includes('simu')) return false;
  } else if (isTargetAiry) {
    if (itemChannelId === 'channel_bamep_cs2' || itemUserId === 'channel_bamep_cs2' || itemChannelId.includes('bamep')) return false;
    if (itemChannelId === 'channel_simu' || itemUserId === 'channel_simu' || itemChannelId.includes('simu')) return false;
  } else if (isTargetSimu) {
    if (itemChannelId === 'channel_bamep_cs2' || itemUserId === 'channel_bamep_cs2' || itemChannelId.includes('bamep')) return false;
    if (itemChannelId === 'channel_airy' || itemUserId === 'channel_airy' || itemChannelId.includes('airy')) return false;
  }

  // CHECK 4: Direct channel / user match
  if (itemChannelId === canonical || itemUserId === canonical) return true;
  if (isTargetBamep && (itemChannelId.includes('bamep') || itemUserId.includes('bamep') || itemChannelId.includes('zeixst') || itemUserId.includes('zeixst'))) return true;
  if (isTargetAiry && (itemChannelId.includes('airy') || itemUserId.includes('airy'))) return true;
  if (isTargetSimu && (itemChannelId.includes('simu') || itemUserId.includes('simu'))) return true;

  // Custom user created items in current session
  if (!item.channelId && !item.userId) return true;

  return false;
}

export function filterItemsForRoom<T>(items: T[], roomId: string): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter(item => isItemInRoom(item, roomId));
}
