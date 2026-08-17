import re
with open('src/components/TgUsers.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove handleGiveStartingBudget
content = re.sub(r'const handleGiveStartingBudget = async.*?}\s*};\s*', '', content, flags=re.DOTALL)

# Remove editingBalance User stuff
content = re.sub(r'const \[editingBalanceUser.*?\] = useState<any>\(null\);\n?', '', content)
content = re.sub(r'const \[newBalance.*?\] = useState<number\|string>\(\"\"\);\n?', '', content)

content = re.sub(r'const handleUpdateBalance = async.*?}\s*};\s*', '', content, flags=re.DOTALL)

# Remove HTML containing customStartingMoney
content = re.sub(r'<div[^>]*>[\s\S]*?customStartingMoney[\s\S]*?<\/div>', '', content)
content = re.sub(r'<div[^>]*>\s*<label[^>]*>Начальный баланс[\s\S]*?<\/div>', '', content)

# Look for button that calls handleGiveStartingBudget
content = re.sub(r'<button[^>]*handleGiveStartingBudget[\s\S]*?<\/button>', '', content)
content = re.sub(r'<button[^>]*editingBalanceUser[\s\S]*?<\/button>', '', content)

with open('src/components/TgUsers.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

