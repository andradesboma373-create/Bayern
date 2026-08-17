import re

with open('src/components/TeamProfileModal.tsx', 'r') as f:
    content = f.read()

# We need to change the logic inside processMatch

start_marker = r'if \(m\.maps && Array\.isArray\(m\.maps\) && m\.maps\.length > 0\) \{'
end_marker = r'\} else \{'

# Wait, let's just use Python to surgically replace the block.
