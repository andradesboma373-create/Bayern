import re

with open('src/components/Teams.tsx', 'r') as f:
    content = f.read()

# Add search query state
if "const [searchQuery, setSearchQuery] = useState('');" not in content:
    content = content.replace("const [currentPage, setCurrentPage] = useState(1);", "const [currentPage, setCurrentPage] = useState(1);\n  const [searchQuery, setSearchQuery] = useState('');")

# Update the teams filtering
old_filter = "const filteredTeams = teams.filter(t => activeTab === 'academy' ? t.isAcademy === true : !t.isAcademy);"
new_filter = "const filteredTeams = teams.filter(t => activeTab === 'academy' ? t.isAcademy === true : !t.isAcademy).filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));"
content = content.replace(old_filter, new_filter)

# Add search input UI
# Where to put it? Beside the Tabs.
search_ui = """        <div className="relative w-full md:w-64">
           <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
           <input type="text" placeholder="Поиск команд..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full bg-[#12121a] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ff8f00] transition-colors" />
        </div>
      </div>"""

if "      </div>\n      {loading ? (" in content:
    content = content.replace("      </div>\n      {loading ? (", search_ui + "\n      {loading ? (")

with open('src/components/Teams.tsx', 'w') as f:
    f.write(content)
