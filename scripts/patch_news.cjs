const fs = require('fs');
const file = 'src/components/News.tsx';
let content = fs.readFileSync(file, 'utf8');

// revert selectedPlayerIds
content = content.replace(/const \[selectedPlayerIds, setSelectedPlayerIds\] = useState<string\[\]>\(\[\]\);\n\s*/, '');
content = content.replace(/setSelectedPlayerIds\(\[\]\);\n\s*/g, '');
content = content.replace(/playerIds: selectedPlayerIds,\n\s*/, '');

// revert renderNewsBanner
const newRender = `if (n.type === 'roster_announcement' && team) {
      return (
        <div id={\`news-banner-\${n.id}\`} className={\`w-full h-auto min-h-64 rounded-xl overflow-hidden relative border border-white/10 p-6 flex flex-col \${!n.background || n.background.startsWith('http') || n.background.startsWith('data:') ? 'bg-gradient-to-br from-[#1a1a24] to-[#12121a]' : n.background}\`} style={n.background && (n.background.startsWith('http') || n.background.startsWith('data:')) ? { backgroundImage: \`url(\${n.background})\`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
          <div className="absolute -right-20 -top-20 opacity-5 blur-2xl pointer-events-none">
             <TeamLogo teamName={team.name} logoUrl={team.logoUrl} className="w-96 h-96 grayscale" />
          </div>
          <div className="flex items-center gap-4 mb-6 z-10">
            <TeamLogo teamName={team.name} logoUrl={team.logoUrl} className="w-16 h-16 drop-shadow-lg" />
            <div>
              <div className="text-blue-400 font-bold uppercase tracking-widest text-xs mb-1">Анонс состава</div>
              <h3 className="text-2xl font-black text-white">{n.title}</h3>
            </div>
          </div>
          <div className="flex gap-4 items-center justify-center flex-wrap mt-auto z-10 bg-black/30 p-4 rounded-xl border border-white/5">
            {team.players && team.players.map((p: any, idx: number) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <PlayerAvatar playerName={p.nickname} avatarUrl={p.avatarUrl} className="w-12 h-12" />
                <span className="text-xs font-bold text-white">{p.nickname}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }`;
content = content.replace(/if \(n\.type === 'roster_announcement'\) \{[\s\S]*?(?=if \(n\.type === 'player_transfer' && team && player\))/g, newRender + '\n    ');

// revert title logic
content = content.replace(/if \(newType === 'roster_announcement'\) finalTitle = t \? `\$\{t\.name\} ROSTER` : `NEW ROSTER`;/, "if (newType === 'roster_announcement' && t) finalTitle = `${t.name} ROSTER`;");

// revert validation
content = content.replace(/if \(newType === 'roster_announcement' && !selectedTeamId && selectedPlayerIds\.length === 0\) \{\s*setError\("Выберите команду или добавьте игроков"\);\s*setTimeout\(\(\) => setError\(''\), 3000\);\s*return;\s*\}/, `if (newType === 'roster_announcement' && !selectedTeamId) {
      setError("Выберите команду");
      setTimeout(() => setError(''), 3000);
      return;
    }`);

// revert optional text
content = content.replace(/Выберите команду \{newType === 'roster_announcement' && '\(необязательно\)'\}/, "Выберите команду");

// remove custom roster fields
content = content.replace(/\{newType === 'roster_announcement' && \([\s\S]*?\}\)\]\)\}\s*<\/select>\s*<p className="text-\[10px\] text-white\/30">Если не выбрано, будет использован текущий состав команды\.<\/p>\s*<\/div>\s*\)\}\s*/, '');

fs.writeFileSync(file, content);
