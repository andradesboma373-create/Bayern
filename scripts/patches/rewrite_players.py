import re

with open('src/components/Players.tsx', 'r') as f:
    content = f.read()

# 1. Add pagination state and icons
if "import { User, Plus, Trash2, Edit2, ShieldAlert, RefreshCw, Search, ExternalLink" in content:
    content = content.replace("ExternalLink } from 'lucide-react';", "ExternalLink, ChevronLeft, ChevronRight, Check } from 'lucide-react';")

if "const [editIsAcademy, setEditIsAcademy] = useState(false);" in content:
    content = content.replace("const [editIsAcademy, setEditIsAcademy] = useState(false);", "const [editIsAcademy, setEditIsAcademy] = useState(false);\n  const [currentPage, setCurrentPage] = useState(1);\n  const itemsPerPage = 50;")

# Search Reset Page logic:
# Let's intercept search query change to reset page.
if "onChange={e => setSearchQuery(e.target.value)}" in content:
    content = content.replace("onChange={e => setSearchQuery(e.target.value)}", "onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}")

if "onClick={() => setActiveTab('regular')}" in content:
    content = content.replace("onClick={() => setActiveTab('regular')}", "onClick={() => { setActiveTab('regular'); setCurrentPage(1); }}")
if "onClick={() => setActiveTab('academy')}" in content:
    content = content.replace("onClick={() => { setActiveTab('academy');", "onClick={() => { setActiveTab('academy'); setCurrentPage(1);") # Wait, it might be different
    content = content.replace("onClick={() => setActiveTab('academy')}", "onClick={() => { setActiveTab('academy'); setCurrentPage(1); }}")

# Locate the rendering part
start_marker = r'      \{loading \? \(\n        <div className="text-center p-8 text-white/50">Загрузка\.\.\.<\/div>\n      \) : players\.filter\(p => activeTab === \'academy\' \? p\.isAcademy === true : !p\.isAcademy\)'
end_marker = r'          \}\n        <\/div>\n      \)\}'

match = re.search(f"{start_marker}.*?(?={end_marker})", content, re.DOTALL)
if match:
    pass
else:
    print("Could not match the render block in Players.tsx")

