import re

with open('src/components/Teams.tsx', 'r') as f:
    content = f.read()

# Add newTeamLogo state
if "const [newTeamLogo, setNewTeamLogo] = useState<string | null>(null);" not in content:
    content = content.replace("const [newTeamName, setNewTeamName] = useState('');", "const [newTeamName, setNewTeamName] = useState('');\n  const [newTeamLogo, setNewTeamLogo] = useState<string | null>(null);")

# Handle it in handleAddTeam: when editing, only update logoUrl if it's set or changed.
# Actually, the simplest is to include it in the object.
if "name: newTeamName.trim()," in content:
    # Need to be careful. There's updateDoc and addDoc, and also fallback.
    pass

def replace_with_logo(match):
    return match.group(0) + "\n          ...(newTeamLogo !== null ? { logoUrl: newTeamLogo } : {}),"

# Using regex to insert logoUrl right after `isAcademy: !!newTeamIsAcademy,` inside updateDoc, addDoc and fallbacks.
content = re.sub(r'(isAcademy: !!newTeamIsAcademy,)', replace_with_logo, content)

# Reset state
if "setNewTeamName('');" in content:
    content = content.replace("setNewTeamName('');", "setNewTeamName('');\n      setNewTeamLogo(null);")

if "setNewTeamIsAcademy(false);" in content:
    content = content.replace("setNewTeamIsAcademy(false);", "setNewTeamIsAcademy(false);\n      setNewTeamLogo(null);")

# When editing, populate newTeamLogo
if "setNewTeamIsAcademy(!!t.isAcademy);" in content:
    content = content.replace("setNewTeamIsAcademy(!!t.isAcademy);", "setNewTeamIsAcademy(!!t.isAcademy);\n                          setNewTeamLogo(t.logoUrl || null);")

# Also for edit button
if "setNewTeamName(t.name);" in content:
    pass # we handled it near setNewTeamIsAcademy

# Now add the UI for logo upload in the form
# We will add it next to the Team Name input

form_ui = """
            <div className="md:col-span-3">
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Название команды</label>
              <div className="flex gap-4">
                <div 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        const rawBase64 = event.target?.result as string;
                        if (!rawBase64) return;
                        try {
                          const compressedBase64 = await compressImage(rawBase64, 128, 128);
                          setNewTeamLogo(compressedBase64);
                        } catch (err) {
                          console.error(err);
                        }
                      };
                      reader.readAsDataURL(file);
                    };
                    input.click();
                  }}
                  className="w-[52px] h-[52px] shrink-0 rounded-xl bg-black/50 border border-white/10 hover:border-[#ff8f00]/50 flex items-center justify-center cursor-pointer transition-colors relative overflow-hidden group"
                  title="Загрузить логотип"
                >
                  {newTeamLogo ? (
                    <img src={newTeamLogo} className="w-full h-full object-cover" alt="Logo" />
                  ) : (
                    <span className="text-[10px] font-black text-white/30 uppercase">Лого</span>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-[8px] font-bold uppercase text-white">Изменить</span>
                  </div>
                </div>
                <input required type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff8f00] font-black text-xl" placeholder="NAVI" />
              </div>
            </div>"""

content = re.sub(r'<div className="md:col-span-3">.*?<input required type="text" value=\{newTeamName\}.*?</div>', form_ui, content, flags=re.DOTALL)

with open('src/components/Teams.tsx', 'w') as f:
    f.write(content)
