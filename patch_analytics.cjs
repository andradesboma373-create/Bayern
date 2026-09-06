const fs = require('fs');
let code = fs.readFileSync('src/components/AdminAnalytics.tsx', 'utf8');

code = code.replace(
`              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-2xl font-black text-white font-mono">
                  {stats.readsToday.toLocaleString()}
                </span>
                <span className="text-xs text-white/40 font-mono">
                  / {stats.maxReads.toLocaleString()} ({stats.percentReads}%)
                </span>
              </div>`,
`              <div className="flex flex-col mb-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-white font-mono">
                    {stats.readsToday.toLocaleString()}
                  </span>
                  <span className="text-sm text-white/60 font-mono">
                    ({stats.percentReads}%)
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-white/40">Использовано</span>
                  <span className="text-xs font-bold text-emerald-400">Осталось: {(stats.maxReads - stats.readsToday).toLocaleString()}</span>
                </div>
              </div>`
);

code = code.replace(
`              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-2xl font-black text-white font-mono">
                  {stats.writesToday.toLocaleString()}
                </span>
                <span className="text-xs text-white/40 font-mono">
                  / {stats.maxWrites.toLocaleString()} ({stats.percentWrites}%)
                </span>
              </div>`,
`              <div className="flex flex-col mb-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-white font-mono">
                    {stats.writesToday.toLocaleString()}
                  </span>
                  <span className="text-sm text-white/60 font-mono">
                    ({stats.percentWrites}%)
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-white/40">Использовано</span>
                  <span className="text-xs font-bold text-emerald-400">Осталось: {(stats.maxWrites - stats.writesToday).toLocaleString()}</span>
                </div>
              </div>`
);

code = code.replace(
`Счетчик операций чтения в Firestore. Сбрасывается каждые 24ч.`,
`Операции чтения из Firebase (Spark Plan: 50,000 в сутки). Сбрасывается каждые 24ч.`
);

code = code.replace(
`Счетчик операций записи в Firestore. Сбрасывается каждые 24ч.`,
`Операции записи в Firebase (Spark Plan: 20,000 в сутки). Сбрасывается каждые 24ч.`
);

fs.writeFileSync('src/components/AdminAnalytics.tsx', code);
