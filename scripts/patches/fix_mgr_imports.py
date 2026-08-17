with open('src/components/setka_tourn/TournamentManager.tsx', 'r') as f:
    content = f.read()

# Add MatchCard
if "import MatchCard from './MatchCard';" not in content:
    content = content.replace("import TournamentSettingsForm from './TournamentSettingsForm';", "import TournamentSettingsForm from './TournamentSettingsForm';\nimport MatchCard from './MatchCard';")

# Add Check to lucide-react
if " Check," not in content:
    content = content.replace("import { Trophy, Plus,", "import { Trophy, Plus, Check,")

with open('src/components/setka_tourn/TournamentManager.tsx', 'w') as f:
    f.write(content)
