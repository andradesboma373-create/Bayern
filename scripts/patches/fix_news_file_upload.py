import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

custom_image_old = """              {newType === 'custom' && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-xs font-bold text-white/50 uppercase">Ссылка на изображение</label>
                  <input
                    type="text"
                    value={newImage}
                    onChange={e => setNewImage(e.target.value)}
                    placeholder="https://example.com/image.png"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  {newImage && (
                     <div className="mt-4 rounded-xl overflow-hidden h-40 border border-white/10">
                       <img src={newImage} alt="Preview" className="w-full h-full object-cover" />
                     </div>
                  )}
                </div>
              )}"""

custom_image_new = """              {newType === 'custom' && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-xs font-bold text-white/50 uppercase">Изображение</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newImage}
                      onChange={e => setNewImage(e.target.value)}
                      placeholder="Ссылка (или загрузите файл ->)"
                      className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <label className="cursor-pointer flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl px-4 transition-colors" title="Загрузить файл">
                      <ImageIcon className="w-5 h-5 text-white/70" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (e) => setNewImage(e.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }} 
                      />
                    </label>
                  </div>
                  {newImage && (
                     <div className="mt-4 rounded-xl overflow-hidden h-40 border border-white/10">
                       <img src={newImage} alt="Preview" className="w-full h-full object-cover" />
                     </div>
                  )}
                </div>
              )}"""

content = content.replace(custom_image_old, custom_image_new)


bg_image_old = """                  {(selectedBg === 'custom_url' || selectedBg.startsWith('http') || selectedBg.startsWith('data:')) && (
                    <div className="mt-2 animate-fade-in">
                       <input 
                         type="text"
                         placeholder="Вставьте ссылку на изображение (http://...)"
                         value={selectedBg === 'custom_url' ? '' : selectedBg}
                         onChange={(e) => setSelectedBg(e.target.value || 'custom_url')}
                         className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
                       />
                    </div>
                  )}"""

bg_image_new = """                  {(selectedBg === 'custom_url' || selectedBg.startsWith('http') || selectedBg.startsWith('data:')) && (
                    <div className="mt-2 animate-fade-in flex gap-2">
                       <input 
                         type="text"
                         placeholder="Ссылка на фон (или загрузите файл ->)"
                         value={selectedBg === 'custom_url' ? '' : selectedBg}
                         onChange={(e) => setSelectedBg(e.target.value || 'custom_url')}
                         className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
                       />
                       <label className="cursor-pointer flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl px-4 transition-colors" title="Загрузить файл">
                         <ImageIcon className="w-5 h-5 text-white/70" />
                         <input 
                           type="file" 
                           accept="image/*" 
                           className="hidden" 
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               const reader = new FileReader();
                               reader.onload = (e) => setSelectedBg(e.target?.result as string);
                               reader.readAsDataURL(file);
                             }
                           }} 
                         />
                       </label>
                    </div>
                  )}"""

content = content.replace(bg_image_old, bg_image_new)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
print("Updated file upload")
