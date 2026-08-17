import re

with open('src/components/Teams.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add download function
download_fn = """  const handleDownloadTeam = (team: any) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(team, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `team_${team.name}.json`);
    dlAnchorElem.click();
  };
"""

content = content.replace("  const isTeamLocked = (teamId: string) => {", download_fn + "\n  const isTeamLocked = (teamId: string) => {")

start_str = '<div className="grid grid-cols-2 gap-2">'
end_str = '</button>\n                  </div>\n                  <button \n                    onClick={() => setConfirmDeleteId(t.id)}'

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    old_buttons = content[start_idx:end_idx + len('</button>\n                  </div>')]
    
    new_buttons = """<div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setSelectedTeamRoster(t.id)}
                      className="flex items-center justify-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/20 rounded-lg py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      👥 Состав
                    </button>
                    <button 
                      onClick={() => {
                        setEditingTeamId(t.id);
                        setNewTeamName(t.name);
                        setNewTeamIsAcademy(!!t.isAcademy);
                        const pids = t.players.map((p: any) => p.id || '');
                        while (pids.length < 5) {
                          pids.push('');
                        }
                        setSelectedPlayers(pids);
                        setShowAddForm(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex items-center justify-center gap-2 bg-[#ff8f00]/10 hover:bg-[#ff8f00]/20 text-[#ff8f00] border border-[#ff8f00]/20 rounded-lg py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" /> Изменить
                    </button>
                    <button 
                      onClick={() => handleDownloadTeam(t)}
                      className="flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer col-span-2"
                    >
                      <Download className="w-3 h-3" /> Скачать JSON
                    </button>
                  </div>"""
    
    content = content.replace(old_buttons, new_buttons)
    content = content.replace("import { Users, Plus, Trash2, ShieldAlert, Edit2, X } from 'lucide-react';", "import { Users, Plus, Trash2, ShieldAlert, Edit2, X, Download } from 'lucide-react';")
    
    with open('src/components/Teams.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched buttons")
else:
    print("Could not find button grid")

