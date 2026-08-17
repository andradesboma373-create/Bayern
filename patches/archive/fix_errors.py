import re

# Fix Simulator.tsx
with open('src/components/Simulator.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'setTeam1Tactic\([^\)]+\);\n', '', content)
content = re.sub(r'setTeam2Tactic\([^\)]+\);\n', '', content)
# Also fix tactic inside TeamCard that might still be present
# Let's see if tactic is used at line 1517: maybe I missed one tactic_block or something.
# I will use regex to remove any reference to `tactic`.
content = re.sub(r'value=\{tactic\}', '', content)

with open('src/components/Simulator.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix PlayerAvatar.tsx
with open('src/components/PlayerAvatar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("avatarUrl\n}: PlayerAvatarProps) {", "avatarUrl,\n  game\n}: PlayerAvatarProps) {")

with open('src/components/PlayerAvatar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)


# Fix TeamLogo.tsx
with open('src/components/TeamLogo.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("logoUrl\n}: TeamLogoProps) {", "logoUrl,\n  game\n}: TeamLogoProps) {")

with open('src/components/TeamLogo.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
