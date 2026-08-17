const fs = require('fs');
const file = 'src/components/TgUsers.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('selectedRole')) {
  content = content.replace(
    "const [selectedTeamId, setSelectedTeamId] = useState<string>('');",
    "const [selectedTeamId, setSelectedTeamId] = useState<string>('');\n  const [selectedRole, setSelectedRole] = useState('Менеджер (Лидер)');"
  );
  content = content.replace(
    /teamName: team\.name,\s*status: 'Тренер'/g,
    "teamName: team.name,\n        status: selectedRole"
  );
  fs.writeFileSync(file, content);
}

