import sys
with open('src/lib/simulation.ts', 'r') as f:
    content = f.read()

content = content.replace('p.fk', 'p.fk || 0')
content = content.replace('p.fd', 'p.fd || 0')
content = content.replace('p.k1', 'p.k1 || 0')
content = content.replace('p.k2', 'p.k2 || 0')
content = content.replace('p.k3', 'p.k3 || 0')
content = content.replace('p.k4', 'p.k4 || 0')
content = content.replace('p.k5', 'p.k5 || 0')
content = content.replace('p.hs', 'p.hs || 0')

with open('src/lib/simulation.ts', 'w') as f:
    f.write(content)
