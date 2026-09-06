import re

with open('src/components/PlayerProfileModal.tsx', 'r') as f:
    content = f.read()

content = content.replace('Игровой Рейтинг (1-100)', 'Игровой Рейтинг (50-200)')
content = content.replace('min="1"\\n                    max="100"', 'min="50"\\n                    max="200"')

with open('src/components/PlayerProfileModal.tsx', 'w') as f:
    f.write(content)
print("Updated rating bounds")
