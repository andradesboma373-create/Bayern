import re

with open('src/components/setka_tourn/TournamentSettingsForm.tsx', 'r') as f:
    content = f.read()

# Add error state
state_old = "const [hasCustomized, setHasCustomized] = useState(false);"
state_new = "const [hasCustomized, setHasCustomized] = useState(false);\n  const [error, setError] = useState('');"
content = content.replace(state_old, state_new)

# Update handleFormSubmit
submit_old = """  const handleFormSubmit = () => {
    const finalSettings: TournamentSettings = {
      ...settings,
      seedingType: settings.seedingType === 'random' ? 'random' : 'manual'
    };
    onSave(name, finalSettings, teams, logoUrl, prizePool);
  };"""

submit_new = """  const handleFormSubmit = () => {
    if (!name.trim()) {
      setError('Введите название турнира');
      setTimeout(() => setError(''), 3000);
      return;
    }
    if (teams.length < 2) {
      setError('Добавьте как минимум 2 команды (или загрузите пресет)');
      setTimeout(() => setError(''), 3000);
      return;
    }
    const finalSettings: TournamentSettings = {
      ...settings,
      seedingType: settings.seedingType === 'random' ? 'random' : 'manual'
    };
    onSave(name, finalSettings, teams, logoUrl, prizePool);
  };"""
content = content.replace(submit_old, submit_new)

# Update button to not be disabled
btn_old = """      <button
          onClick={handleFormSubmit}
          disabled={!name.trim() || teams.length < 2}
          className="w-full bg-[#ff8f00] text-black font-black uppercase tracking-wider py-4 rounded-xl hover:bg-[#ffa733] disabled:opacity-30 transition-colors mt-4 cursor-pointer"
      >
          {submitLabel}
      </button>"""

btn_new = """      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-xl mt-4 text-center font-bold animate-fade-in">
          {error}
        </div>
      )}
      <button
          onClick={handleFormSubmit}
          className="w-full bg-[#ff8f00] text-black font-black uppercase tracking-wider py-4 rounded-xl hover:bg-[#ffa733] transition-colors mt-4 cursor-pointer"
      >
          {submitLabel}
      </button>"""
content = content.replace(btn_old, btn_new)

with open('src/components/setka_tourn/TournamentSettingsForm.tsx', 'w') as f:
    f.write(content)
