import re
with open('src/components/Teams.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the block that renders the grid of players
# It starts at `<div className="bg-black/40 rounded-xl p-4 border border-white/5">`
# and ends before `</div>\n            </div>\n          ))}`
# Wait, let's just find the start and find the matching closing div for that block.
start_idx = content.find('<div className="bg-black/40 rounded-xl p-4 border border-white/5">')
if start_idx != -1:
    end_idx = content.find('            </div>\n          ))}', start_idx)
    if end_idx != -1:
        content = content[:start_idx] + content[end_idx:]

with open('src/components/Teams.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
