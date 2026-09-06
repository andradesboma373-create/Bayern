import re
import glob

for filepath in glob.glob('src/components/**/*.tsx', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find cases where players array is mapped without a fallback and replace it
    # We want to match .players.map( and replace with .players?.map(
    # Also handle (t.players || []).map -> we don't need to change if it's already safe.
    
    # Actually, using optional chaining .players?.map is the safest!
    content = re.sub(r'(\w+)\.players\.map\(', r'(\1.players || []).map(', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
