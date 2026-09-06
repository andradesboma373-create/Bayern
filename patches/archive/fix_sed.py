import re
import glob

for filepath in glob.glob('src/components/**/*.tsx', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix the messed up parenthesis
    content = content.replace('(.players || []).map(', '.players?.map(')
    content = re.sub(r'(\w+)\(\.players \?\.map\(', r'\1.players?.map(', content)
    
    # Also just change (someVar.players || []).map( to someVar.players?.map( just for cleanliness
    content = re.sub(r'\(\s*(\w+)\.players\s*\|\|\s*\[\]\s*\)\.map\(', r'\1.players?.map(', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
