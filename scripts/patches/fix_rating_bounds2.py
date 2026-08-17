import re

with open('src/components/PlayerProfileModal.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'min="1"\s+max="100"', 'min="50"\n                    max="200"', content)

with open('src/components/PlayerProfileModal.tsx', 'w') as f:
    f.write(content)
print("Updated min/max")
