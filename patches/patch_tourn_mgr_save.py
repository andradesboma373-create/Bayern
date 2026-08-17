import re

with open('src/components/setka_tourn/TournamentManager.tsx', 'r') as f:
    content = f.read()

create_old = """    saveTournament(userId, t);
    setTournaments(loadTournaments(userId));
    setIsCreating(false);
    setActiveTournament(t);
  };"""

create_new = """    try {
      saveTournament(userId, t);
      setTournaments(loadTournaments(userId));
      setIsCreating(false);
      setActiveTournament(t);
    } catch (e: any) {
      alert("Ошибка при сохранении турнира! Возможно, слишком много данных (попробуйте сжать картинки): " + e.message);
    }
  };"""

content = content.replace(create_old, create_new)

with open('src/components/setka_tourn/TournamentManager.tsx', 'w') as f:
    f.write(content)
