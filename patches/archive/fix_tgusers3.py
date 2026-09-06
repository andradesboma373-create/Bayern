with open('src/components/TgUsers.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('{/* Editing Balance Modal */}')
if start_idx != -1:
    end_idx = content.find('{/* Confirm Remove Team Modal */}')
    if end_idx != -1:
        content = content[:start_idx] + content[end_idx:]

with open('src/components/TgUsers.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
