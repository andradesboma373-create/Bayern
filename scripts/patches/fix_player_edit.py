import re

with open('src/components/Players.tsx', 'r') as f:
    content = f.read()

content = content.replace("const [editIsAcademy, setEditIsAcademy] = useState(false);", "const [editIsAcademy, setEditIsAcademy] = useState(false);\n  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);")

start_edit = """  const startEdit = (player: any) => {
    setEditingPlayerId(player.id);
    setEditNickname(player.nickname);
    setEditRole(player.role);
    setEditRating(player.rating);
    setEditValRating(player.valRating || 0);
    setEditIsAcademy(!!player.isAcademy);"""
new_start_edit = start_edit + "\n    setEditAvatarUrl(player.avatarUrl || null);"
content = content.replace(start_edit, new_start_edit)

save_edit = """      if (user.isLocalDemo) {
        throw new Error("Local demo mode");
      }
      await updateDoc(doc(db, 'players', editingPlayerId), {
        nickname: editNickname.trim(),
        role: editRole,
        rating: editRating,
        valRating: editValRating,
        isAcademy: editIsAcademy
      });"""
new_save_edit = """      if (user.isLocalDemo) {
        throw new Error("Local demo mode");
      }
      await updateDoc(doc(db, 'players', editingPlayerId), {
        nickname: editNickname.trim(),
        role: editRole,
        rating: editRating,
        valRating: editValRating,
        isAcademy: editIsAcademy,
        avatarUrl: editAvatarUrl
      });"""
content = content.replace(save_edit, new_save_edit)

local_save_edit = """          if (p.id === editingPlayerId) {
            return {
              ...p,
              nickname: editNickname.trim(),
              role: editRole,
              rating: editRating,
              valRating: editValRating,
              isAcademy: editIsAcademy
            };"""
new_local_save_edit = """          if (p.id === editingPlayerId) {
            return {
              ...p,
              nickname: editNickname.trim(),
              role: editRole,
              rating: editRating,
              valRating: editValRating,
              isAcademy: editIsAcademy,
              avatarUrl: editAvatarUrl
            };"""
content = content.replace(local_save_edit, new_local_save_edit)

edit_ui = """                return (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4" colSpan={7}>
                      <div className="flex gap-4 items-end flex-wrap md:flex-nowrap">
                        <div className="flex-1 min-w-[150px]">
                          <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Никнейм</label>
                          <input type="text" value={editNickname} onChange={e => setEditNickname(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                        </div>"""

new_edit_ui = """                return (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4" colSpan={7}>
                      <div className="flex gap-4 items-end flex-wrap md:flex-nowrap">
                        <div className="flex-1 min-w-[150px]">
                          <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Никнейм</label>
                          <div className="flex gap-2">
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
                                      setEditAvatarUrl(compressedBase64);
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                };
                                input.click();
                              }}
                              className="w-[42px] h-[42px] shrink-0 rounded-xl bg-black/50 border border-white/10 hover:border-blue-500/50 flex items-center justify-center cursor-pointer transition-colors relative overflow-hidden group"
                              title="Изменить аватарку"
                            >
                              {editAvatarUrl ? (
                                <img src={editAvatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                              ) : (
                                <span className="text-[10px] font-black text-white/30 uppercase">Фото</span>
                              )}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="text-[8px] font-bold uppercase text-white">Изм</span>
                              </div>
                            </div>
                            <input type="text" value={editNickname} onChange={e => setEditNickname(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                          </div>
                        </div>"""

content = content.replace(edit_ui, new_edit_ui)

with open('src/components/Players.tsx', 'w') as f:
    f.write(content)

print("Done")
