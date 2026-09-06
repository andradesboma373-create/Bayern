with open('src/components/Teams.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if not content.strip().endswith('}'):
    content = content + '\n  );\n}\n'

with open('src/components/Teams.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
