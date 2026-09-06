import re

with open('src/components/Simulator.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the whole tacticsUsed block from Simulator.tsx
block_to_remove = """        {currentLog?.tacticsUsed && currentLog.tacticsUsed.length > 0 && (
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {currentLog.tacticsUsed.map((idx: number) => (
              <span key={idx} className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                🧠 {tactic}
              </span>
            ))}
          </div>
        )}"""
content = content.replace(block_to_remove, '')

# If the block was formatted slightly differently:
content = re.sub(r'\{currentLog\?\.tacticsUsed.*?\}\)', '', content, flags=re.DOTALL)

with open('src/components/Simulator.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
