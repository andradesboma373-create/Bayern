import re

with open('src/components/TeamLogo.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

logo_search_old = """    for (const ext of extensions) {
      for (const name of nameVariations) {
        if (game === 'cs2') {
          candidates.push(`/logos/cs2/${name}.${ext}`);
        } else if (game === 's2') {
          candidates.push(`/logos/s2/${name}.${ext}`);
        } else {
          candidates.push(`/logos/${name}.${ext}`);
          candidates.push(`/logos/cs2/${name}.${ext}`);
          candidates.push(`/logos/s2/${name}.${ext}`);
        }
      }
    }"""

logo_search_new = """    for (const ext of extensions) {
      for (const name of nameVariations) {
        if (game === 'cs2') {
          candidates.push(`/logos/cs2/${name}.${ext}`);
          candidates.push(`/logos/${name}.${ext}`);
        } else if (game === 's2') {
          candidates.push(`/logos/s2/${name}.${ext}`);
          candidates.push(`/logos/${name}.${ext}`);
        } else {
          candidates.push(`/logos/${name}.${ext}`);
          candidates.push(`/logos/cs2/${name}.${ext}`);
          candidates.push(`/logos/s2/${name}.${ext}`);
        }
      }
    }"""

content = content.replace(logo_search_old, logo_search_new)
with open('src/components/TeamLogo.tsx', 'w', encoding='utf-8') as f:
    f.write(content)


with open('src/components/PlayerAvatar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

avatar_search_old = """    for (const ext of extensions) {
      for (const name of nameVariations) {
        if (game === 'cs2') {
          candidates.push(`/avatars/cs2/${name}.${ext}`);
        } else if (game === 's2') {
          candidates.push(`/avatars/s2/${name}.${ext}`);
        } else {
          candidates.push(`/avatars/${name}.${ext}`);
          candidates.push(`/avatars/cs2/${name}.${ext}`);
          candidates.push(`/avatars/s2/${name}.${ext}`);
        }
      }
    }"""

avatar_search_new = """    for (const ext of extensions) {
      for (const name of nameVariations) {
        if (game === 'cs2') {
          candidates.push(`/avatars/cs2/${name}.${ext}`);
          candidates.push(`/avatars/${name}.${ext}`);
        } else if (game === 's2') {
          candidates.push(`/avatars/s2/${name}.${ext}`);
          candidates.push(`/avatars/${name}.${ext}`);
        } else {
          candidates.push(`/avatars/${name}.${ext}`);
          candidates.push(`/avatars/cs2/${name}.${ext}`);
          candidates.push(`/avatars/s2/${name}.${ext}`);
        }
      }
    }"""

content = content.replace(avatar_search_old, avatar_search_new)
with open('src/components/PlayerAvatar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
