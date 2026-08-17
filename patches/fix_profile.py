import sys

with open('src/components/PlayerProfileModal.tsx', 'r') as f:
    content = f.read()

old_input = """                <div>
                  <label className="text-xs font-bold text-white/50 uppercase mb-2 block">
                    Ссылка на фото / Аватар (URL)
                  </label>
                  <input
                    type="url"
                    value={editAvatarUrl}
                    onChange={(e) => setEditAvatarUrl(e.target.value)}
                    placeholder="https://i.imgur.com/example.png"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>"""

new_input = """                <div>
                  <label className="text-xs font-bold text-white/50 uppercase mb-2 block">
                    Аватар (URL или загрузка)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={editAvatarUrl}
                      onChange={(e) => setEditAvatarUrl(e.target.value)}
                      placeholder="https://... или загрузите файл ->"
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e) => {
                          const file = (e.target.files)[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const res = await fetch('/api/upload?type=avatar', { method: 'POST', body: formData });
                            const data = await res.json();
                            if (data.url) setEditAvatarUrl(data.url);
                          } catch (err) { console.error(err); }
                        };
                        input.click();
                      }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition-colors flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Файл
                    </button>
                  </div>
                </div>"""

content = content.replace(old_input, new_input)
if 'Upload,' not in content:
    content = content.replace('X,', 'X, Upload,')

with open('src/components/PlayerProfileModal.tsx', 'w') as f:
    f.write(content)
