import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Make sure it picks up memoryCache for tournaments if localStorage is empty or fails.
# Since App.tsx runs the sync, and storage.ts has memoryCache. Let's export memoryCache and use it, 
# or just add a hook to `saveTournaments` to trigger sync. 
# But App.tsx already syncs when "tournaments-updated" is emitted. 
# Wait, App.tsx reads from localStorage!
old_read = """        for (const item of keys) {
          const raw = localStorage.getItem(item.cacheKey);"""

new_read = """        import { loadTournaments } from './components/setka_tourn/storage';
        for (const item of keys) {
          let raw = localStorage.getItem(item.cacheKey);
          if (item.prop === 'tournaments') {
            const mem = loadTournaments(user.uid);
            if (mem && mem.length > 0) raw = JSON.stringify(mem);
          }"""

content = content.replace(old_read, new_read)

with open('src/App.tsx', 'w') as f:
    f.write(content)
