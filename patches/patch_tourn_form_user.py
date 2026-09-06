import re

with open('src/components/setka_tourn/TournamentSettingsForm.tsx', 'r') as f:
    content = f.read()

# Add user to props
props_old = """interface Props {
  initialName?: string;
  initialLogoUrl?: string;
  initialPrizePool?: string;
  initialSettings?: TournamentSettings;
  initialTeams?: Team[];
  onSave: (name: string, settings: TournamentSettings, teams: Team[], logoUrl?: string, prizePool?: string) => void;
  submitLabel: string;
}"""

props_new = """interface Props {
  user?: any;
  initialName?: string;
  initialLogoUrl?: string;
  initialPrizePool?: string;
  initialSettings?: TournamentSettings;
  initialTeams?: Team[];
  onSave: (name: string, settings: TournamentSettings, teams: Team[], logoUrl?: string, prizePool?: string) => void;
  submitLabel: string;
}"""
content = content.replace(props_old, props_new)

sig_old = """export default function TournamentSettingsForm({ 
    initialName = "", 
    initialLogoUrl = "",
    initialPrizePool = "$100,000",
    initialSettings, 
    initialTeams = [], 
    onSave, 
    submitLabel 
}: Props) {"""

sig_new = """export default function TournamentSettingsForm({ 
    user,
    initialName = "", 
    initialLogoUrl = "",
    initialPrizePool = "$100,000",
    initialSettings, 
    initialTeams = [], 
    onSave, 
    submitLabel 
}: Props) {"""
content = content.replace(sig_old, sig_new)

# Add load teams logic
teams_old = """  const handleAddTeam = () => {
    if (newTeamName.trim()) {
      setTeams([...teams, { id: Date.now().toString(), name: newTeamName.trim() }]);
      setNewTeamName("");
    }
  };"""

teams_new = """  const [globalTeams, setGlobalTeams] = useState<any[]>([]);
  useEffect(() => {
    if (user?.uid) {
      const stored = localStorage.getItem(`teams_${user.uid}`);
      if (stored) {
        setGlobalTeams(JSON.parse(stored));
      }
    }
  }, [user]);

  const handleAddTeam = () => {
    if (newTeamName.trim()) {
      setTeams([...teams, { id: Date.now().toString(), name: newTeamName.trim() }]);
      setNewTeamName("");
    }
  };

  const handleAddGlobalTeam = (globalTeam: any) => {
    if (!teams.find(t => t.name === globalTeam.name)) {
      setTeams([...teams, { id: Date.now().toString(), name: globalTeam.name }]);
    }
  };"""
content = content.replace(teams_old, teams_new)

# Add UI for selecting global teams
ui_old = """              <button 
                onClick={handleAddTeam}
                className="bg-[#333] hover:bg-[#444] px-4 rounded-xl font-bold transition-colors"
              >
                  Добавить
              </button>
          </div>"""

ui_new = """              <button 
                onClick={handleAddTeam}
                className="bg-[#333] hover:bg-[#444] px-4 rounded-xl font-bold transition-colors"
              >
                  Добавить
              </button>
          </div>
          {globalTeams.length > 0 && (
             <div className="mt-4 border-t border-white/10 pt-4">
                <p className="text-xs font-bold text-white/50 mb-2 uppercase">Или добавьте из ваших команд:</p>
                <div className="flex flex-wrap gap-2">
                   {globalTeams.filter(gt => !teams.find(t => t.name === gt.name)).map(gt => (
                      <button 
                        key={gt.id} 
                        onClick={() => handleAddGlobalTeam(gt)}
                        className="bg-black/30 hover:bg-black/60 border border-white/5 hover:border-blue-500/50 px-3 py-1.5 rounded-lg text-sm text-white/80 transition-colors flex items-center gap-2"
                      >
                         <span className="text-[10px]">➕</span> {gt.name}
                      </button>
                   ))}
                </div>
             </div>
          )}"""
content = content.replace(ui_old, ui_new)

with open('src/components/setka_tourn/TournamentSettingsForm.tsx', 'w') as f:
    f.write(content)
