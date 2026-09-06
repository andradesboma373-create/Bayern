import re
with open('src/components/TgUsers.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'const handleOpenBalanceEdit =.*?\};\n', '', content, flags=re.DOTALL)
content = re.sub(r'<button[^>]*onClick=\{[^}]*handleOpenBalanceEdit[^}]*\}[^>]*>.*?<\/button>', '', content, flags=re.DOTALL)

with open('src/components/TgUsers.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
