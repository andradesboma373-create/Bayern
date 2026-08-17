import re

with open('src/components/setka_tourn/TournamentManager.tsx', 'r') as f:
    content = f.read()

# Add error state
state_old = "const [isCreating, setIsCreating] = useState(false);"
state_new = "const [isCreating, setIsCreating] = useState(false);\n  const [creationError, setCreationError] = useState('');"
content = content.replace(state_old, state_new)

# Update handleCreate
create_old = """    try {
      saveTournament(userId, t);
      setTournaments(loadTournaments(userId));
      setIsCreating(false);
      setActiveTournament(t);
    } catch (e: any) {
      alert("Ошибка при сохранении турнира! Возможно, слишком много данных (попробуйте сжать картинки): " + e.message);
    }"""

create_new = """    try {
      saveTournament(userId, t);
      setTournaments(loadTournaments(userId));
      setIsCreating(false);
      setActiveTournament(t);
    } catch (e: any) {
      setCreationError("Ошибка сохранения! Превышен лимит памяти (слишком много данных/картинок). Уменьшите размер логотипов команд в меню 'Команды'.");
      setTimeout(() => setCreationError(''), 10000);
    }"""

content = content.replace(create_old, create_new)

# Show error in UI
ui_old = """  if (isCreating) {
      return (
          <div className="w-full max-w-4xl mx-auto">
              <button onClick={() => setIsCreating(false)} className="flex items-center gap-2 text-white/50 hover:text-white mb-6">
                  <ArrowLeft className="w-4 h-4" /> Отмена
              </button>
              <h2 className="text-3xl font-black mb-8">Создать турнир</h2>
              <TournamentSettingsForm user={user} onSave={handleCreate} submitLabel="Создать и Начать" />
          </div>
      );
  }"""

ui_new = """  if (isCreating) {
      return (
          <div className="w-full max-w-4xl mx-auto">
              <button onClick={() => setIsCreating(false)} className="flex items-center gap-2 text-white/50 hover:text-white mb-6">
                  <ArrowLeft className="w-4 h-4" /> Отмена
              </button>
              <h2 className="text-3xl font-black mb-8">Создать турнир</h2>
              {creationError && (
                  <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-xl mb-6 text-center font-bold animate-fade-in shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                      {creationError}
                  </div>
              )}
              <TournamentSettingsForm user={user} onSave={handleCreate} submitLabel="Создать и Начать" />
          </div>
      );
  }"""

content = content.replace(ui_old, ui_new)

with open('src/components/setka_tourn/TournamentManager.tsx', 'w') as f:
    f.write(content)
