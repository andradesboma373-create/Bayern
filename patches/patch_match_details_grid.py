import re

with open('src/components/MatchDetails.tsx', 'r') as f:
    content = f.read()

content = content.replace("grid grid-cols-1 lg:grid-cols-2 gap-8", "grid grid-cols-1 xl:grid-cols-2 gap-8")

with open('src/components/MatchDetails.tsx', 'w') as f:
    f.write(content)
