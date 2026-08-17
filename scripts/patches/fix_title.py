import re

with open('index.html', 'r') as f:
    content = f.read()

content = content.replace('<title>My Google AI Studio App</title>', '<title>Virtual Arena</title>')

with open('index.html', 'w') as f:
    f.write(content)

with open('metadata.json', 'r') as f:
    metadata = f.read()

metadata = metadata.replace('"name": "Remix: Remix: Match Simulator"', '"name": "Virtual Arena"')

with open('metadata.json', 'w') as f:
    f.write(metadata)

print("Title and metadata updated")
