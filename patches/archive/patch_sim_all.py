import re

with open('src/components/Simulator.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("updateBetaTournamentMatchResult(\n                       state.selectedTournament", "updateBetaTournamentMatchResult(\n                       user.uid,\n                       state.selectedTournament")
content = content.replace("updateBetaTournamentMatchResult(\n              selectedTournament", "updateBetaTournamentMatchResult(\n              user.uid,\n              selectedTournament")
content = content.replace("updateBetaTournamentMatchResult(\n                 selectedTournament", "updateBetaTournamentMatchResult(\n                 user.uid,\n                 selectedTournament")

with open('src/components/Simulator.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
