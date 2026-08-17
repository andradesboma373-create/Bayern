const fs = require('fs');
const file = 'src/components/PlayerProfileModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add imports
if (!content.includes("from '../firebase'")) {
  content = content.replace(
    "import { loadTournaments } from './setka_tourn/storage';",
    "import { loadTournaments } from './setka_tourn/storage';\nimport { doc, updateDoc, db, collection, query, where, getDocs } from '../firebase';"
  );
}

// Replace handleSaveProfileEdit
const handleSaveStart = 'const handleSaveProfileEdit = (e: React.FormEvent) => {';
const handleSaveEnd = 'setTimeout(() => setSaveSuccess(false), 2500);\n  };';
const newHandleSave = `const handleSaveProfileEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPts = Number(editValRating) || 0;
    const updatedData = {
      ...player,
      nickname: editNickname.trim(),
      realName: editRealName.trim(),
      country: editCountry,
      age: Number(editAge),
      role: editRole,
      rating: Number(editRating),
      valRating: newPts,
      avatarUrl: editAvatarUrl.trim(),
      socials: {
        twitter: editTwitter.trim(),
        instagram: editInstagram.trim(),
        faceit: editFaceit.trim()
      }
    };

    // Save avatar to localStorage for instant persistence
    if (editAvatarUrl.trim()) {
      localStorage.setItem(\`player_avatar_\${editNickname.trim().toLowerCase()}\`, editAvatarUrl.trim());
    }

    try {
      if (!user.isLocalDemo && player.id) {
        // Update in Firebase
        await updateDoc(doc(db, 'players', player.id), {
          nickname: updatedData.nickname,
          realName: updatedData.realName,
          country: updatedData.country,
          age: updatedData.age,
          role: updatedData.role,
          rating: updatedData.rating,
          valRating: updatedData.valRating,
          avatarUrl: updatedData.avatarUrl,
          socials: updatedData.socials
        });

        // Also update the player in teams containing this player
        const qTeams = query(collection(db, 'teams'), where('channelId', '==', user.uid));
        const qsTeams = await getDocs(qTeams);
        for (const d of qsTeams.docs) {
          const teamData = d.data();
          let changed = false;
          const updatedPlayers = teamData.players?.map((tp: any) => {
            if (tp.id === player.id) {
              changed = true;
              return {
                ...tp,
                nickname: updatedData.nickname,
                role: updatedData.role,
                rating: updatedData.rating,
                valRating: updatedData.valRating,
                avatarUrl: updatedData.avatarUrl,
                country: updatedData.country
              };
            }
            return tp;
          });
          
          if (changed) {
            const totalValRating = updatedPlayers.reduce((acc: number, p: any) => acc + (p && p.id ? (Number(p.valRating) || 0) : 0), 0);
            await updateDoc(doc(db, 'teams', d.id), {
              players: updatedPlayers,
              totalValRating
            });
          }
        }
      }
    } catch (err) {
      console.warn("Failed to update in Firebase:", err);
    }

    // Update in team roster inside localStorage if player is in a team
    try {
      const localTeams = JSON.parse(localStorage.getItem(\`teams_\${uid}\`) || '[]');
      let teamChanged = false;
      const updatedTeams = localTeams.map((t: any) => {
        let pInTeam = false;
        const updatedPlayers = (t.players || []).map((tp: any) => {
          if (tp.id === player.id || (tp.nickname && tp.nickname.trim().toLowerCase() === player.nickname?.trim().toLowerCase())) {
            pInTeam = true;
            return {
              ...tp,
              nickname: editNickname.trim(),
              role: editRole,
              rating: Number(editRating),
              valRating: newPts,
              country: editCountry,
              avatarUrl: editAvatarUrl.trim()
            };
          }
          return tp;
        });

        if (pInTeam) {
          teamChanged = true;
          const totalVal = updatedPlayers.reduce((acc: number, p: any) => acc + (p?.valRating || 0), 0);
          return { ...t, players: updatedPlayers, totalValRating: totalVal };
        }
        return t;
      });

      if (teamChanged) {
        localStorage.setItem(\`teams_\${uid}\`, JSON.stringify(updatedTeams));
      }
      
      const localPlayers = JSON.parse(localStorage.getItem(\`players_\${uid}\`) || '[]');
      const pIdx = localPlayers.findIndex((p: any) => p.id === player.id);
      if (pIdx !== -1) {
        localPlayers[pIdx] = updatedData;
        localStorage.setItem(\`players_\${uid}\`, JSON.stringify(localPlayers));
      }
    } catch (err) {
      console.error("Error updating player in storage:", err);
    }

    if (onUpdatePlayer) {
      onUpdatePlayer(updatedData);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };`;

const startIndex = content.indexOf(handleSaveStart);
const endIndex = content.indexOf(handleSaveEnd) + handleSaveEnd.length;

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newHandleSave + content.substring(endIndex);
  fs.writeFileSync(file, content);
  console.log("Patched PlayerProfileModal.tsx");
} else {
  console.log("Could not find handleSaveProfileEdit block");
}
