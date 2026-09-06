import re

with open('src/components/PlayerAvatar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace <User ... /> with <span>?</span>
old_fallback = """<User className="w-1/2 h-1/2 text-white/30" />"""
new_fallback = """<span className="text-white/50 font-black">?</span>"""

content = content.replace(old_fallback, new_fallback)

# We should also adjust the container bg-black/40 if needed, but it seems okay
# In TeamLogo it's bg-transparent, let's keep bg-black/40 for avatar so it's a circle.
# Let's remove the import of User from lucide-react if we want, but not necessary.

with open('src/components/PlayerAvatar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
