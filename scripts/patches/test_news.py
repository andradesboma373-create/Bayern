import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

# Fix Delete button z-index
content = content.replace(
    'className="absolute top-4 right-4 w-8 h-8 bg-red-500/80 hover:bg-red-500 text-white rounded-lg items-center justify-center hidden group-hover:flex transition-all"',
    'className="absolute top-4 right-4 w-8 h-8 bg-red-500/80 hover:bg-red-500 text-white rounded-lg items-center justify-center hidden group-hover:flex transition-all z-20"'
)

# And what about 'ОПУБЛИКОВАТЬ'? Is there any issue with selectedPlayerId or something? 
# Maybe a propagation issue? No, it's just a button.
with open('src/components/News.tsx', 'w') as f:
    f.write(content)
print("Fixed Delete Z index")
