import re

with open('src/components/Teams.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the player grid from the card
grid_start = content.find('<div className="bg-black/40 rounded-xl p-4 border border-white/5">')
if grid_start != -1:
    grid_end = content.find('</div>\n            </div>\n          ))}</div>', grid_start)
    if grid_end != -1:
        # Instead of finding </div> exactly, let's just use regex to remove that entire div block
        # The block ends before `</div>\n            </div>\n          ))}`
        pass

