import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

# Fix Download propagation
content = content.replace(
    "onClick={() => handleDownload(n.id, n.title)}",
    "onClick={(e) => { e.stopPropagation(); handleDownload(n.id, n.title); }}"
)

# Fix Delete propagation
content = content.replace(
    "onClick={() => handleDelete(n.id)}",
    "onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}"
)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
print("Fixed propagation")
