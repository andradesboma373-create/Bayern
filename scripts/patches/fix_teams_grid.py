import re

with open('src/components/Teams.tsx', 'r') as f:
    content = f.read()

old_table = """        return (
          <div className="flex flex-col">
            <div className="flex text-[10px] font-bold text-white/40 uppercase tracking-widest bg-black/40 p-3 md:px-4 md:py-3 rounded-t-xl border border-white/5">
              <div className="w-10 text-center">#</div>
              <div className="flex-1 min-w-0">Команда</div>
              <div className="w-1/3 md:w-2/5 text-center hidden sm:block">Состав</div>
              <div className="w-16 md:w-20 text-center">TP</div>
              <div className="w-24 md:w-32 text-right">Действия</div>
            </div>
            
            <div className="flex flex-col border border-white/5 rounded-b-xl border-t-0 bg-[#0f0f18]">"""

# Let's find the closing boundary:
# It's right before:
#             {/* Pagination Controls */}

match = re.search(r'        return \(\n          <div className="flex flex-col">\n            <div className="flex text-\[10px\].*?\{currentTeams\.map\(\(t, idx\) => \{.*?\);\n              \}\)\}\n            <\/div>', content, flags=re.DOTALL)

if match:
    pass
else:
    print("Match failed!")
    
