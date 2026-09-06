import os
import re

paths = [
  'src/components/Teams.tsx',
  'src/components/Players.tsx',
  'src/components/News.tsx',
  'src/components/Simulator.tsx',
  'src/components/setka_tourn/TournamentSettingsForm.tsx',
  'src/components/setka_tourn/TournamentManager.tsx'
]

def process_file(p):
    if not os.path.exists(p): return
    with open(p, 'r') as f:
        content = f.read()

    # Find all occurrences of const reader = new FileReader();
    # We want to replace the whole block up to reader.readAsDataURL(file);
    # Since inside the block it usually calls a state setter like `setNewTeamLogo(...)` or `onChange(compressed)`
    
    # We will use a regex to capture what it does with the result.
    # Usually it's something like:
    # const rawBase64 = event.target?.result as string;
    # const compressed = await compressImage(rawBase64, 128, 128);
    # setFoo(compressed);
    
    # Let's write a generic replacement that uploads and then calls the same setter!
    # But wait, every setter is different!
    # So let's match the inner setter logic.
    
    pattern = re.compile(
        r"const reader = new FileReader\(\);\s*reader\.onload = async \(event\) => \{.*?(?:const rawBase64.*?)?(?:const compressed.*?await compressImage\([^,]+, \d+, \d+\);)?\s*(.*?\(compressed(?:.*?)?\)|.*?\(rawBase64\)|.*?\(event\.target\?\.result as string\)).*?\};\s*reader\.readAsDataURL\(file\);",
        re.DOTALL
    )
    
    def replacer(m):
        setter = m.group(1).strip()
        setter = setter.replace('compressed', 'url').replace('rawBase64', 'url').replace('event.target?.result as string', 'url')
        return f"""const formData = new FormData();
                      formData.append('file', file);
                      try {{
                        const res = await fetch('/api/upload', {{ method: 'POST', body: formData }});
                        const data = await res.json();
                        if (data.url) {{
                          const url = data.url;
                          {setter};
                        }}
                      }} catch(e) {{ console.error("Upload error", e); }}"""

    new_content, count = pattern.subn(replacer, content)
    if count > 0:
        with open(p, 'w') as f:
            f.write(new_content)
        print(f"Patched {count} FileReaders in {p}")

for p in paths:
    process_file(p)
