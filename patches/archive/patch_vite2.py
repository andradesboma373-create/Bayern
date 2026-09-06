import re

with open("vite.config.ts", "r") as f:
    content = f.read()

# Replace the server block entirely to disable HMR locally for sure
new_server_block = """server: {
      hmr: false,
      watch: null,
    },"""
content = re.sub(r'server:\s*\{.*?\},', new_server_block, content, flags=re.DOTALL)

with open("vite.config.ts", "w") as f:
    f.write(content)
