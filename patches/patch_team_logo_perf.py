import re

with open('src/components/TeamLogo.tsx', 'r') as f:
    content = f.read()

# Add global cache logic
cache_code = """
let cachedLocalTeams: any[] | null = null;
let lastCacheTime = 0;

function getLocalTeams() {
  if (cachedLocalTeams && Date.now() - lastCacheTime < 5000) {
     return cachedLocalTeams;
  }
  const allTeams: any[] = [];
  for (let i = 0; i < localStorage.length; i++) {
     const key = localStorage.key(i);
     if (key && key.startsWith('teams_')) {
       try {
         const teams = JSON.parse(localStorage.getItem(key) || '[]');
         if (Array.isArray(teams)) {
            allTeams.push(...teams);
         }
       } catch(e) {}
     }
  }
  cachedLocalTeams = allTeams;
  lastCacheTime = Date.now();
  return allTeams;
}

export function TeamLogo({ 
"""

content = content.replace("export function TeamLogo({ ", cache_code)


old_loop = """    // 3. Списки команд в localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('teams_')) {
        try {
          const teams = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(teams)) {
            const found = teams.find(t => t.name && t.name.trim().toLowerCase() === lowerName);
            if (found && found.logoUrl && !candidates.includes(found.logoUrl)) {
              candidates.push(found.logoUrl);
            }
          }
        } catch (e) {}
      }
    }"""

new_loop = """    // 3. Списки команд в localStorage (с кэшированием для оптимизации производительности)
    const localTeams = getLocalTeams();
    const found = localTeams.find((t: any) => t.name && t.name.trim().toLowerCase() === lowerName);
    if (found && found.logoUrl && !candidates.includes(found.logoUrl)) {
      candidates.push(found.logoUrl);
    }"""

content = content.replace(old_loop, new_loop)

with open('src/components/TeamLogo.tsx', 'w') as f:
    f.write(content)
