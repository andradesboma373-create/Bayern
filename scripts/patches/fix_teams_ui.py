import re

with open('src/components/Teams.tsx', 'r') as f:
    content = f.read()

# First replace the div containing the tabs to include search
old_tabs = """      <div className="flex gap-2 border-b border-white/5 pb-4">
        <button
          type="button"
          onClick={() => { setActiveTab('regular'); setCurrentPage(1); }}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
            activeTab === 'regular'
              ? 'bg-[#ff8f00] text-black border-[#ff8f00] shadow-md shadow-[#ff8f00]/15'
              : 'bg-[#12121a] text-white/50 border-white/5 hover:text-white hover:bg-white/5'
          }`}
        >
          Обычные команды
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('academy'); setCurrentPage(1); }}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
            activeTab === 'academy'
              ? 'bg-[#ff8f00] text-black border-[#ff8f00] shadow-md shadow-[#ff8f00]/15'
              : 'bg-[#12121a] text-white/50 border-white/5 hover:text-white hover:bg-white/5'
          }`}
        >
          Академия
        </button>
      </div>"""

new_tabs = """      <div className="flex flex-col md:flex-row gap-4 justify-between border-b border-white/5 pb-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab('regular'); setCurrentPage(1); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
              activeTab === 'regular'
                ? 'bg-[#ff8f00] text-black border-[#ff8f00] shadow-md shadow-[#ff8f00]/15'
                : 'bg-[#12121a] text-white/50 border-white/5 hover:text-white hover:bg-white/5'
            }`}
          >
            Обычные команды
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('academy'); setCurrentPage(1); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
              activeTab === 'academy'
                ? 'bg-[#ff8f00] text-black border-[#ff8f00] shadow-md shadow-[#ff8f00]/15'
                : 'bg-[#12121a] text-white/50 border-white/5 hover:text-white hover:bg-white/5'
            }`}
          >
            Академия
          </button>
        </div>
        <div className="relative w-full md:w-64">
           <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
           <input type="text" placeholder="Поиск команд..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full bg-[#12121a] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ff8f00] transition-colors" />
        </div>
      </div>"""

content = content.replace(old_tabs, new_tabs)

with open('src/components/Teams.tsx', 'w') as f:
    f.write(content)
