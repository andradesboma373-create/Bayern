with open('src/components/Matches.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "const localMatches = rawLocalMatches.map((m: any) => ({",
    "const localMatches = (rawLocalMatches || []).filter((m: any) => m !== null && m !== undefined).map((m: any) => ({"
)

with open('src/components/Matches.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
