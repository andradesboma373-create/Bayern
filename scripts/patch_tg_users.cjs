const fs = require('fs');
const file = 'src/components/TgUsers.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add state for selectedRole
content = content.replace(
  "const [selectedTeamId, setSelectedTeamId] = useState('');",
  "const [selectedTeamId, setSelectedTeamId] = useState('');\n  const [selectedRole, setSelectedRole] = useState('Менеджер (Лидер)');"
);

// Update status assignment
content = content.replace(
  /teamName: team\.name,\s*status: 'Тренер'/g,
  "teamName: team.name,\n        status: selectedRole"
);

// Add the role selector in the form
const formReplacement = `                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Роль</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="Менеджер (Лидер)">Менеджер (Лидер)</option>
                  <option value="Тренер">Тренер</option>
                  <option value="Игрок">Игрок</option>
                </select>
              </div>`;

content = content.replace("                </select>\n              </div>", formReplacement);

fs.writeFileSync(file, content);
