import fs from 'fs';
let content = fs.readFileSync('src/components/TgUsers.tsx', 'utf-8');

// Header
if (!content.includes('<th className="p-4 font-bold">Бюджет</th>')) {
    content = content.replace(
        '<th className="p-4 font-bold">Статус</th>',
        '<th className="p-4 font-bold">Статус</th>\n                  <th className="p-4 font-bold">Бюджет</th>'
    );
}

// Table cell
if (!content.includes('<td className="p-4 font-mono font-bold text-[#ff8f00]">\n                      ${(u.money || 0).toLocaleString()}')) {
    content = content.replace(
        /<\/span>\s*<\/td>\s*<td className="p-4 text-right">/g,
        '</span>\n                    </td>\n                    <td className="p-4 font-mono font-bold text-[#ff8f00]">\n                      ${(u.money || 0).toLocaleString()}\n                    </td>\n                    <td className="p-4 text-right">'
    );
}

// Card cell
if (!content.includes('Бюджет</p>')) {
    content = content.replace(
        /<div className="flex items-center gap-1.5 mb-1">\s*<UserCheck className="w-3.5 h-3.5 text-white\/40" \/>\s*<span className="text-white\/40 text-xs font-bold uppercase tracking-wider">Роль<\/span>\s*<\/div>\s*<div className="text-xs font-bold text-white uppercase tracking-wider">\s*\{u.status \|\| \(u.teamId \? 'Менеджер' : 'Свободный агент'\)\}\s*<\/div>\s*<\/div>\s*<\/div>\s*<div className="flex gap-2">/g,
        `<div className="flex items-center gap-1.5 mb-1">
                                <UserCheck className="w-3.5 h-3.5 text-white/40" />
                                <span className="text-white/40 text-xs font-bold uppercase tracking-wider">Роль</span>
                              </div>
                              <div className="text-xs font-bold text-white uppercase tracking-wider">
                                {u.status || (u.teamId ? 'Менеджер' : 'Свободный агент')}
                              </div>
                            </div>
                            <div className="flex-1 bg-black/20 rounded-xl p-3 border border-white/5">
                              <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Бюджет</p>
                              <p className="text-sm font-mono font-bold text-[#ff8f00]">
                                \${(u.money || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">`
    );
}

fs.writeFileSync('src/components/TgUsers.tsx', content);
console.log('patched tg users money');
