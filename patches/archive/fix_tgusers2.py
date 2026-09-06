import re

with open('src/components/TgUsers.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove editing balance modal
content = re.sub(r'\{\/\* Editing Balance Modal \*\/\}.*?Редактировать Баланс.*?<\/div>\s*<\/div>\s*\}', '', content, flags=re.DOTALL)

with open('src/components/TgUsers.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
