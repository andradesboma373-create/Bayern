import re

with open('src/components/Teams.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

func = """
  const handleSaveValRating = async (teamId: string, playerIndex: number, playerId: string, newVal: number) => {
    try {
      if (user.isLocalDemo) throw new Error('Local Demo');
      const team = teams.find(t => t.id === teamId);
      if (!team) return;
      const updatedPlayers = [...team.players];
      updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], valRating: newVal };
      
      const totalValRating = updatedPlayers.reduce((acc: number, p: any) => acc + (p && p.id ? (p.valRating != null && String(p.valRating) !== '' ? Number(p.valRating) : 0) : 0), 0);
      
      await updateDoc(doc(db, 'teams', teamId), {
        players: updatedPlayers,
        totalValRating
      });
      await updateDoc(doc(db, 'players', playerId), {
        valRating: newVal
      });
      fetchData();
      alert('VAC Pts сохранены!');
    } catch (e) {
      console.warn('Fallback saving valRating locally', e);
      const localTeams = JSON.parse(localStorage.getItem(`teams_${user.uid}`) || '[]');
      const idx = localTeams.findIndex((t: any) => t.id === teamId);
      if (idx !== -1) {
        const team = localTeams[idx];
        const updatedPlayers = [...team.players];
        updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], valRating: newVal };
        localTeams[idx] = { ...team, players: updatedPlayers };
        localTeams[idx].totalValRating = updatedPlayers.reduce((acc: number, p: any) => acc + (p && p.id ? (p.valRating != null && String(p.valRating) !== '' ? Number(p.valRating) : 0) : 0), 0);
        localStorage.setItem(`teams_${user.uid}`, JSON.stringify(localTeams));
        
        const localPlayers = JSON.parse(localStorage.getItem(`players_${user.uid}`) || '[]');
        const pIdx = localPlayers.findIndex((p: any) => p.id === playerId);
        if (pIdx !== -1) {
          localPlayers[pIdx].valRating = newVal;
          localStorage.setItem(`players_${user.uid}`, JSON.stringify(localPlayers));
        }
      }
      fetchData();
      alert('VAC Pts сохранены локально!');
    }
  };
"""

content = content.replace("  const handleAddPlayerToTeamSlot = ", func + "\n  const handleAddPlayerToTeamSlot = ")

# And fix 'X' import
content = content.replace("import { Users, Plus, Trash2, ShieldAlert, Edit2 } from 'lucide-react';", "import { Users, Plus, Trash2, ShieldAlert, Edit2, X } from 'lucide-react';")

with open('src/components/Teams.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
