with open('src/components/setka_tourn/TournamentManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'const dataUrl = await toPng(stageRef.current, {',
    "const { toPng } = await import('html-to-image');\n              const dataUrl = await toPng(stageRef.current, {"
)

with open('src/components/setka_tourn/TournamentManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
