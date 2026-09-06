import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

# Fix 1: newImage input
old_input1 = """                    <input
                      type="text"
                      value={newImage}
                      onChange={e => setNewImage(e.target.value)}
                      placeholder="Ссылка (или загрузите файл ->)"
                      className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />"""

new_input1 = """                    <input
                      type="text"
                      value={newImage.startsWith('data:') ? '' : newImage}
                      onChange={e => setNewImage(e.target.value)}
                      placeholder={newImage.startsWith('data:') ? "Загружен локальный файл" : "Ссылка (или загрузите файл ->)"}
                      className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />"""

content = content.replace(old_input1, new_input1)

# Fix 2: selectedBg input
old_input2 = """                       <input 
                         type="text"
                         placeholder="Ссылка на фон (или загрузите файл ->)"
                         value={selectedBg === 'custom_url' ? '' : selectedBg}
                         onChange={(e) => setSelectedBg(e.target.value || 'custom_url')}
                         className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
                       />"""

new_input2 = """                       <input 
                         type="text"
                         placeholder={selectedBg.startsWith('data:') ? "Загружен локальный файл" : "Ссылка на фон (или загрузите файл ->)"}
                         value={selectedBg === 'custom_url' || selectedBg.startsWith('data:') ? '' : selectedBg}
                         onChange={(e) => setSelectedBg(e.target.value || 'custom_url')}
                         className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
                       />"""

content = content.replace(old_input2, new_input2)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
