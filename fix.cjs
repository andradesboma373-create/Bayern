const fs = require('fs');
let code = fs.readFileSync('server/roomsManager.ts', 'utf8');

const replacement = ` */
export function trackRoomRequest(
  userIdOrChannel: string,
  method: string,
  path: string,
  ip: string,
  opType: 'read' | 'write' = 'read',
  details?: string
): { isAllowed: boolean; error?: string } {
  ensureStorage();

  if (opType === 'read') dailyQuota.readsToday++;
  if (opType === 'write') dailyQuota.writesToday++;
`;

const arr = code.split('\n');
// We want to replace from ' */' to '  ensureStorage();'
let start = arr.findIndex(line => line === ' */');
let end = arr.findIndex((line, i) => i > start && line === '  ensureStorage();');

arr.splice(start, end - start + 1, replacement);
fs.writeFileSync('server/roomsManager.ts', arr.join('\n'));
