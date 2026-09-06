import re

with open('src/components/TgUsers.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix broken JSX by completely removing the editing balance modal and giving budget
content = re.sub(r'\{\/\* Editing Balance Modal \*\/\}.*?<\/form>\s*<\/div>\s*<\/div>\s*\}', '', content, flags=re.DOTALL)
content = re.sub(r'const handleSaveBalance =.*?}\s*};\s*', '', content, flags=re.DOTALL)
content = re.sub(r'const \[editingBalanceUser.*?\] = useState<any>\(null\);\n?', '', content)
content = re.sub(r'const \[newBalance.*?\] = useState<number\|string>\(\"\"\);\n?', '', content)

with open('src/components/TgUsers.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
