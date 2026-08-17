import fs from 'fs';

let content = fs.readFileSync('src/components/setka_tourn/SingleEliminationStage.tsx', 'utf-8');
content = content.replace(
    /btnStyle=\{tournament\.settings\.btnStyle\}\n\s*\/>/g,
    'btnStyle={tournament.settings.btnStyle}\n                                        onSwapTeam={handleSwapTeam}\n                                        allTeams={tournament.teams}\n                                        isExporting={isExporting}\n                                    />'
);
fs.writeFileSync('src/components/setka_tourn/SingleEliminationStage.tsx', content);
console.log('patched se');
