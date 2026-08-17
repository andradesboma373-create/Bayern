import re

# PlayerAvatar.tsx
with open('src/components/PlayerAvatar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """        if (game === 'cs2') {
          candidates.push(`/avatars/cs2/${name}.${ext}`);
          candidates.push(`/avatars/${name}.${ext}`);
        } else if (game === 's2') {
          candidates.push(`/avatars/s2/${name}.${ext}`);
          candidates.push(`/avatars/${name}.${ext}`);
        } else {
          candidates.push(`/avatars/${name}.${ext}`);
          candidates.push(`/avatars/cs2/${name}.${ext}`);
          candidates.push(`/avatars/s2/${name}.${ext}`);
        }"""

new_logic = """        if (game === 's2') {
          candidates.push(`/avatars2/${name}.${ext}`);
        } else if (game === 'cs2') {
          candidates.push(`/avatars/${name}.${ext}`);
        } else {
          candidates.push(`/avatars/${name}.${ext}`);
          candidates.push(`/avatars2/${name}.${ext}`);
        }"""

content = content.replace(old_logic, new_logic)

with open('src/components/PlayerAvatar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# TeamLogo.tsx
with open('src/components/TeamLogo.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_logo_logic = """        if (game === 'cs2') {
          candidates.push(`/logos/cs2/${name}.${ext}`);
          candidates.push(`/logos/${name}.${ext}`);
        } else if (game === 's2') {
          candidates.push(`/logos/s2/${name}.${ext}`);
          candidates.push(`/logos/${name}.${ext}`);
        } else {
          candidates.push(`/logos/${name}.${ext}`);
          candidates.push(`/logos/cs2/${name}.${ext}`);
          candidates.push(`/logos/s2/${name}.${ext}`);
        }"""

new_logo_logic = """        if (game === 's2') {
          candidates.push(`/logos2/${name}.${ext}`);
        } else if (game === 'cs2') {
          candidates.push(`/logos/${name}.${ext}`);
        } else {
          candidates.push(`/logos/${name}.${ext}`);
          candidates.push(`/logos2/${name}.${ext}`);
        }"""

content = content.replace(old_logo_logic, new_logo_logic)

with open('src/components/TeamLogo.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
