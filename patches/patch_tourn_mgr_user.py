import re

with open('src/components/setka_tourn/TournamentManager.tsx', 'r') as f:
    content = f.read()

content = content.replace("<TournamentSettingsForm ", "<TournamentSettingsForm user={user} ")
content = content.replace("<TournamentSettingsForm onSave={handleCreate}", "<TournamentSettingsForm user={user} onSave={handleCreate}")

with open('src/components/setka_tourn/TournamentManager.tsx', 'w') as f:
    f.write(content)
