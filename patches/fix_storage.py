import sys

with open('src/components/setka_tourn/storage.ts', 'r') as f:
    content = f.read()

if 'let memoryCache' not in content:
    content = content.replace('export const loadTournaments', 'let memoryCache: Record<string, Tournament[]> = {};\n\nexport const loadTournaments')

old_load = "export const loadTournaments = (userId: string): Tournament[] => {\n  try {"
new_load = "export const loadTournaments = (userId: string): Tournament[] => {\n  if (memoryCache[userId]) return memoryCache[userId];\n  try {"
content = content.replace(old_load, new_load)

old_save = "export const saveTournaments = (userId: string, tournaments: Tournament[]) => {\n  try {"
new_save = "export const saveTournaments = (userId: string, tournaments: Tournament[]) => {\n  memoryCache[userId] = [...tournaments];\n  try {"
content = content.replace(old_save, new_save)

content = content.replace('if (jsonStr.length > 3000000) { // 3MB limit', 'if (jsonStr.length > 2000000) { // 2MB limit')

with open('src/components/setka_tourn/storage.ts', 'w') as f:
    f.write(content)
