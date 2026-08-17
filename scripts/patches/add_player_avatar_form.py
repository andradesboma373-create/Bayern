import re

with open('src/components/Players.tsx', 'r') as f:
    content = f.read()

# Update state
content = content.replace("const [newPlayer, setNewPlayer] = useState({ nickname: '', role: 'rifler', rating: 100, valRating: 0, isAcademy: false });", "const [newPlayer, setNewPlayer] = useState({ nickname: '', role: 'rifler', rating: 100, valRating: 0, isAcademy: false, avatarUrl: '' });")

# In handleAddPlayer, update doc addition
content = content.replace("isAcademy: !!newPlayer.isAcademy,", "isAcademy: !!newPlayer.isAcademy,\n        avatarUrl: newPlayer.avatarUrl,")

# Reset state
content = content.replace("setNewPlayer({ nickname: '', role: 'rifler', rating: 100, valRating: 0, isAcademy: false });", "setNewPlayer({ nickname: '', role: 'rifler', rating: 100, valRating: 0, isAcademy: false, avatarUrl: '' });")

# Add compressImage function if missing (it might be in Teams.tsx but not Players.tsx)
compress_func = """
  const compressImage = (base64Str: string, maxWidth = 128, maxHeight = 128): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = (err) => reject(err);
    });
  };
"""

if "const compressImage" not in content:
    content = content.replace("  const handleAddPlayer = async (e: React.FormEvent) => {", compress_func + "\n  const handleAddPlayer = async (e: React.FormEvent) => {")

# Replace form HTML
old_html = """          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Никнейм</label>
            <input required type="text" value={newPlayer.nickname} onChange={e => setNewPlayer({...newPlayer, nickname: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" placeholder="s1mple" />
          </div>"""

new_html = """          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Никнейм</label>
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
                        setNewPlayer({...newPlayer, avatarUrl: compressedBase64});
                      } catch (err) {
                        console.error(err);
                      }
                    };
                    reader.readAsDataURL(file);
                  };
                  input.click();
                }}
                className="w-[50px] h-[50px] shrink-0 rounded-xl bg-black/50 border border-white/10 hover:border-blue-500/50 flex items-center justify-center cursor-pointer transition-colors relative overflow-hidden group"
                title="Загрузить аватарку"
              >
                {newPlayer.avatarUrl ? (
                  <img src={newPlayer.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <span className="text-[10px] font-black text-white/30 uppercase">Фон</span>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-[8px] font-bold uppercase text-white">Изменить</span>
                </div>
              </div>
              <input required type="text" value={newPlayer.nickname} onChange={e => setNewPlayer({...newPlayer, nickname: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" placeholder="s1mple" />
            </div>
          </div>"""

content = content.replace(old_html, new_html)

with open('src/components/Players.tsx', 'w') as f:
    f.write(content)
    
