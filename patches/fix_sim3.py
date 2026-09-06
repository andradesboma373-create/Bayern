import sys
import re

with open('src/lib/simulation.ts', 'r') as f:
    content = f.read()

# Make sure all usages of p.fk etc are typed as any
content = re.sub(r'p\.fk', r'(p as any).fk', content)
content = re.sub(r'p\.fd', r'(p as any).fd', content)
content = re.sub(r'p\.k1', r'(p as any).k1', content)
content = re.sub(r'p\.k2', r'(p as any).k2', content)
content = re.sub(r'p\.k3', r'(p as any).k3', content)
content = re.sub(r'p\.k4', r'(p as any).k4', content)
content = re.sub(r'p\.k5', r'(p as any).k5', content)
content = re.sub(r'p\.hs', r'(p as any).hs', content)

with open('src/lib/simulation.ts', 'w') as f:
    f.write(content)
