import fs from 'fs';
let content = fs.readFileSync('src/components/TgUsers.tsx', 'utf-8');

if (!content.includes('Изменение баланса')) {
    const modalString = `
      {editingBalanceUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
              <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-500" /> Изменение баланса
              </h3>
              <p className="text-white/50 text-sm mt-1">@{editingBalanceUser.username || editingBalanceUser.firstName}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Новый баланс ($)</label>
                <input
                  type="number"
                  value={newBalance}
                  onChange={e => setNewBalance(Number(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 font-mono"
                  placeholder="Например, 1000000"
                />
              </div>
            </div>
            <div className="p-4 border-t border-white/5 bg-black/20 flex justify-end gap-3">
              <button 
                onClick={() => setEditingBalanceUser(null)}
                className="px-4 py-2 text-white/50 hover:text-white font-bold transition-colors"
              >
                Отмена
              </button>
              <button 
                onClick={handleSaveBalance}
                className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-wider rounded-xl transition-colors shadow-[0_0_15px_rgba(234,179,8,0.3)]"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
`;

    content = content.replace(
      '      {selectedTgUser && (',
      modalString + '      {selectedTgUser && ('
    );
}

fs.writeFileSync('src/components/TgUsers.tsx', content);
console.log('patched TgUsers modal2');
