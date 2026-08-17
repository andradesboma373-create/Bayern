import re

with open('src/components/Transfers.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """  const isTeamLocked = (teamId: string) => {
    if (tourActive && tourTeams.includes(teamId)) return true;
    const activeTournaments = tournaments.filter(t => t.status === 'ongoing');
    for (const t of activeTournaments) {
        if (t.teams && t.teams.some((team: any) => team.id === teamId)) {
            return true;
        }
    }
    return false;
  };"""

content = re.sub(r"  const isTeamLocked = \(teamId: string\) => \{[\s\S]*?  \};", replacement, content)

with open('src/components/Transfers.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
