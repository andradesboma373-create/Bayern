const fs = require('fs');
let code = fs.readFileSync('src/components/AdminAnalytics.tsx', 'utf8');
code = code.replace(
  /{isSuperAdmin && \( <button[\s\S]*?Создать комнату[\s\S]*?<\/button>/m,
  `{isSuperAdmin && (
            <button
              onClick={() => { setShowCreateModal(true); setCreateSuccessData(null); }}
              className="px-4 py-2.5 bg-[#ff8f00] hover:bg-[#ffa733] text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,143,0,0.3)] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Создать комнату
            </button>
          )}`
);
fs.writeFileSync('src/components/AdminAnalytics.tsx', code);
