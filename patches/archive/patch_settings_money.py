import re

with open('src/components/Settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'const \[startingMoney, setStartingMoney\] = useState\(.*?\);', '', content)
content = re.sub(r'setStartingMoney\(.*?\);', '', content)
content = re.sub(r'startingMoney:.*?\,', '', content)

html_part = """                    <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2 text-[#ff8f00]">
                            Экономика и Трансферы
                        </h4>
                        <div>
                            <label className="block text-xs font-bold text-white/40 uppercase mb-2">Стартовый Бюджет ($)</label>
                            <input 
                                type="number" 
                                min="0"
                                value={startingMoney} 
                                onChange={e => setStartingMoney(Number(e.target.value) || 0)} 
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white font-mono"
                                placeholder="500000"
                            />
                        </div>
                    </div>"""

# There are multiple possible html variations of this section. I will just search for the label
content = re.sub(r'<div[^>]*>[\s\S]*?Стартовый Бюджет[^<]*<\/label>[\s\S]*?<\/div>\s*<\/div>', '', content)

with open('src/components/Settings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
