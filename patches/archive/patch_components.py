import re

with open('src/components/TeamLogo.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add game?: 'cs2' | 's2' to TeamLogoProps
content = content.replace("export interface TeamLogoProps {", "export interface TeamLogoProps {\n  game?: 'cs2' | 's2';")
content = content.replace("logoUrl}: TeamLogoProps) {", "logoUrl,\n  game\n}: TeamLogoProps) {")

logo_search = """    const extensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
    const nameVariations = [lowerName, underscoreName, hyphenName, noSpacesName];

    for (const ext of extensions) {
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

content = re.sub(r'    const extensions = \[.*?\}\n    \}', logo_search, content, flags=re.DOTALL)

with open('src/components/TeamLogo.tsx', 'w', encoding='utf-8') as f:
    f.write(content)


with open('src/components/PlayerAvatar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("export interface PlayerAvatarProps {", "export interface PlayerAvatarProps {\n  game?: 'cs2' | 's2';")
content = content.replace("avatarUrl}: PlayerAvatarProps) {", "avatarUrl,\n  game\n}: PlayerAvatarProps) {")

avatar_search = """    const extensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
    const nameVariations = [lowerName, underscoreName, hyphenName, noSpacesName];

    for (const ext of extensions) {
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

content = re.sub(r'    const extensions = \[.*?\}\n    \}', avatar_search, content, flags=re.DOTALL)

with open('src/components/PlayerAvatar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
