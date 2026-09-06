import fs from 'fs';
let content = fs.readFileSync('src/components/TgUsers.tsx', 'utf-8');

// Table button
if (!content.includes('title="Изменить баланс"')) {
    content = content.replace(
        /<button \n\s*onClick=\{\(\) => handleRemoveTeam\(u\)\}\n\s*className="px-3 py-2 bg-red-500\/10 text-red-400 hover:bg-red-500\/20 rounded-xl transition-all border border-red-500\/10 text-xs font-bold cursor-pointer ml-auto"\n\s*title="Снять команду"\n\s*>\n\s*Снять\n\s*<\/button>/g,
        `<button 
                        onClick={() => handleOpenBalanceEdit(u)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 rounded-xl transition-all border border-yellow-500/10 text-xs font-bold cursor-pointer"
                        title="Изменить баланс"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        Баланс
                      </button>
                      <button 
                        onClick={() => handleRemoveTeam(u)}
                        className="px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-all border border-red-500/10 text-xs font-bold cursor-pointer ml-auto"
                        title="Снять команду"
                      >
                        Снять
                      </button>`
    );

    // Card button
    content = content.replace(
        /<button \n\s*onClick=\{\(\) => handleRemoveTeam\(u\)\}\n\s*className="p-1\.5 bg-red-500\/10 text-red-400 hover:bg-red-500\/20 rounded-lg transition-all border border-red-500\/10"\n\s*title="Снять команду"\n\s*>\n\s*<Trash2 className="w-4 h-4" \/>\n\s*<\/button>/g,
        `<button 
                              onClick={() => handleOpenBalanceEdit(u)}
                              className="p-1.5 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 rounded-lg transition-all border border-yellow-500/10"
                              title="Изменить баланс"
                            >
                              <Coins className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleRemoveTeam(u)}
                              className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-all border border-red-500/10"
                              title="Снять команду"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>`
    );
}

fs.writeFileSync('src/components/TgUsers.tsx', content);
console.log('patched TgUsers buttons2');
