import re

with open('src/components/setka_tourn/storage.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const STORAGE_KEY = 'tournaments_data_beta';", "")
content = content.replace("export const loadTournaments = (): Tournament[] => {", "export const loadTournaments = (userId: string): Tournament[] => {")
content = content.replace("const data = localStorage.getItem(STORAGE_KEY);", "const data = localStorage.getItem('tournaments_' + userId);")
content = content.replace("export const saveTournaments = (tournaments: Tournament[]) => {", "export const saveTournaments = (userId: string, tournaments: Tournament[]) => {")
content = content.replace("localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));", "localStorage.setItem('tournaments_' + userId, JSON.stringify(tournaments));")

content = content.replace("export const saveTournament = (tournament: Tournament) => {", "export const saveTournament = (userId: string, tournament: Tournament) => {")
content = content.replace("const all = loadTournaments();", "const all = loadTournaments(userId);")
content = content.replace("saveTournaments(all);", "saveTournaments(userId, all);")

content = content.replace("export const deleteTournament = (id: string) => {", "export const deleteTournament = (userId: string, id: string) => {")
content = content.replace("saveTournaments(all.filter(t => t.id !== id));", "saveTournaments(userId, all.filter(t => t.id !== id));")

content = content.replace("export const updateBetaTournamentMatchResult = (", "export const updateBetaTournamentMatchResult = (\n  userId: string,")
content = content.replace("saveTournament(tourney);", "saveTournament(userId, tourney);")

with open('src/components/setka_tourn/storage.ts', 'w', encoding='utf-8') as f:
    f.write(content)
