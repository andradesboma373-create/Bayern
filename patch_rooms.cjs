const fs = require('fs');
let code = fs.readFileSync('server/roomsManager.ts', 'utf8');

code = code.replace(
`  if (opType === 'read') dailyQuota.readsToday++;
  if (opType === 'write') dailyQuota.writesToday++;

  if (!room) {
    return { isAllowed: true };
  }
  details?: string): { isAllowed: boolean; error?: string } {
  ensureStorage();`,
`export function trackRoomRequest(
  userIdOrChannel: string,
  method: string,
  path: string,
  ip: string,
  opType: 'read' | 'write' = 'read',
  details?: string): { isAllowed: boolean; error?: string } {
  ensureStorage();

  if (opType === 'read') dailyQuota.readsToday++;
  if (opType === 'write') dailyQuota.writesToday++;
`
);
fs.writeFileSync('server/roomsManager.ts', code);
