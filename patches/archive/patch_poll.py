import re

with open("src/App.tsx", "r") as f:
    content = f.read()

content = content.replace("25000);", "5000);")
content = content.replace("parsed.isLocalDemo = false;", "parsed.isLocalDemo = true;")

with open("src/App.tsx", "w") as f:
    f.write(content)
