import sys

with open('src/lib/simulation.ts', 'r') as f:
    content = f.read()

# Fix types in simulation.ts
content = content.replace("(p as any).fk", "(p as any)?.fk")
content = content.replace("(p as any).fd", "(p as any)?.fd")
content = content.replace("(p as any).k1", "(p as any)?.k1")
content = content.replace("(p as any).k2", "(p as any)?.k2")
content = content.replace("(p as any).k3", "(p as any)?.k3")
content = content.replace("(p as any).k4", "(p as any)?.k4")
content = content.replace("(p as any).k5", "(p as any)?.k5")
content = content.replace("(p as any).hs", "(p as any)?.hs")

with open('src/lib/simulation.ts', 'w') as f:
    f.write(content)
