import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

old_code = """                        <div key={tid} className="flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-1.5 rounded-lg text-sm">
                          <TeamLogo game={user?.game || 'cs2'} teamName={team.name} sizeClassName="w-4 h-4" />"""

new_code = """                        <div key={tid} className="flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-1.5 rounded-lg text-sm">
                          <TeamLogo game={user?.game || 'cs2'} teamName={team.name} logoUrl={team.logoUrl} sizeClassName="w-4 h-4" />"""

content = content.replace(old_code, new_code)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
