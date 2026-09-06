import re

with open('src/components/setka_tourn/types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("export interface Tournament {", "export interface Tournament {\n  channelId?: string;")

with open('src/components/setka_tourn/types.ts', 'w', encoding='utf-8') as f:
    f.write(content)
