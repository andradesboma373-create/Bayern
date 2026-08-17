const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("import sharp from 'sharp'")) {
  content = content.replace('import fs from \'fs\';', "import fs from 'fs';\nimport sharp from 'sharp';");
}

const showRatingRegex = /private async showRatingPage\(chatId: string, page: number, messageId\?: string\) \{[\s\S]*?\}\s*(?=\n\s*private|\n\s*public|\n\s*\})/;

const newShowRatingCode = `private async showRatingPage(chatId: string, page: number, messageId?: string) {
    try {
      const teamsQuery = query(collection(db, 'teams'), where('channelId', '==', this.userId));
      const teamsSnapshot = await getDocs(teamsQuery);
      
      const matchesQuery = query(collection(db, 'matches'), where('userId', '==', this.userId));
      const matchesSnapshot = await getDocs(matchesQuery);
      const matchesData = [];
      matchesSnapshot.forEach(d => matchesData.push(d.data()));

      const fetchedTeams: any[] = [];
      teamsSnapshot.forEach((d) => {
        const data = d.data();
        const players = data.players || [];
        const totalValRating = data.totalValRating || players.reduce((acc: number, p: any) => acc + (p && p.id ? (Number(p.valRating) || 1000) : 0), 0);
        
        // Calculate match stats
        const teamMatches = matchesData.filter(m => m.team1Id === d.id || m.team2Id === d.id);
        let wins = 0;
        let losses = 0;
        
        teamMatches.forEach(m => {
          if (m.team1Id === d.id && m.team1Score > m.team2Score) wins++;
          else if (m.team2Id === d.id && m.team2Score > m.team1Score) wins++;
          else losses++;
        });
        
        const matchesCount = wins + losses;
        const winrate = matchesCount > 0 ? Math.round((wins / matchesCount) * 100) : 0;

        fetchedTeams.push({
          id: d.id,
          name: data.name || 'Неизвестная команда',
          totalValRating,
          matches: matchesCount,
          wins,
          losses,
          winrate
        });
      });

      // Sort by total VAL rating descending
      fetchedTeams.sort((a, b) => b.totalValRating - a.totalValRating);

      const itemsPerPage = 8;
      const totalPages = Math.ceil(fetchedTeams.length / itemsPerPage);
      const currentPage = Math.max(1, Math.min(page, totalPages));
      
      let replyText = \`🏆 *Рейтинг команд VAC Pts* 🏆\\n\\n\`;
      let buttons: any[] = [];

      if (fetchedTeams.length === 0) {
        replyText += \`В вашей системе пока не создано ни одной команды! 🚫\\nСоздайте их в панели управления на сайте.\`;
        await fetch(\`https://api.telegram.org/bot\${this.token}/sendMessage\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: 'Markdown'
          })
        });
        return;
      }

      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, fetchedTeams.length);
      const pageItems = fetchedTeams.slice(startIndex, endIndex);

      let rowsSvg = '';
      let y = 180;
      pageItems.forEach((t, i) => {
        const rank = startIndex + i + 1;
        const rankColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#ffffff';
        // HTML encode team name just in case
        const safeName = t.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        rowsSvg += \`
          <text x="50" y="\${y}" font-family="sans-serif" font-size="22" font-weight="bold" fill="\${rankColor}">#\${rank}</text>
          <text x="130" y="\${y}" font-family="sans-serif" font-size="22" font-weight="bold" fill="#ffffff">\${safeName}</text>
          <text x="450" y="\${y}" font-family="sans-serif" font-size="20" fill="#aaaaaa">\${t.matches}</text>
          <text x="550" y="\${y}" font-family="sans-serif" font-size="20" fill="#4caf50">\${t.wins}</text>
          <text x="650" y="\${y}" font-family="sans-serif" font-size="20" fill="#aaaaaa">\${t.winrate}%</text>
          <text x="750" y="\${y}" font-family="sans-serif" font-size="22" font-weight="bold" fill="#ff8f00" text-anchor="end">\${t.totalValRating}</text>
          <line x1="40" y1="\${y + 20}" x2="760" y2="\${y + 20}" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1"/>
        \`;
        y += 50;
      });

      const svgHeight = 180 + (pageItems.length * 50) + 20;
      const svgString = \`
      <svg width="800" height="\${svgHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#12121a" rx="20"/>
        <text x="400" y="50" font-family="sans-serif" font-size="32" font-weight="bold" fill="#ff8f00" text-anchor="middle">Рейтинг команд VAC Pts</text>
        
        <text x="50" y="120" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff">Место</text>
        <text x="130" y="120" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff">Команда</text>
        <text x="450" y="120" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff">Матчи</text>
        <text x="550" y="120" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff">Победы</text>
        <text x="650" y="120" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff">Винрейт</text>
        <text x="750" y="120" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ff8f00" text-anchor="end">VAC Pts</text>
        <line x1="40" y1="140" x2="760" y2="140" stroke="#ffffff" stroke-opacity="0.2" stroke-width="2"/>
        
        \${rowsSvg}
      </svg>\`;

      const imageBuffer = await sharp(Buffer.from(svgString)).png().toBuffer();

      replyText = \`📈 *Страница \${currentPage} из \${totalPages}*\`;
      const row = [];
      if (currentPage > 1) {
        row.push({ text: '⬅️ Пред.', callback_data: \`rating_page_\${currentPage - 1}\` });
      }
      if (currentPage < totalPages) {
        row.push({ text: 'След. ➡️', callback_data: \`rating_page_\${currentPage + 1}\` });
      }
      if (row.length > 0) {
        buttons.push(row);
      }

      if (messageId) {
        // We cannot simply edit a text message to a photo message in Telegram directly using editMessageText
        // So we delete the old message and send a new photo message
        await fetch(\`https://api.telegram.org/bot\${this.token}/deleteMessage\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, message_id: messageId })
        }).catch(e => console.error(e));
      }

      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', new Blob([imageBuffer], { type: 'image/png' }), 'rating.png');
      formData.append('caption', replyText);
      formData.append('parse_mode', 'Markdown');
      if (buttons.length > 0) {
        formData.append('reply_markup', JSON.stringify({ inline_keyboard: buttons }));
      }

      await fetch(\`https://api.telegram.org/bot\${this.token}/sendPhoto\`, {
        method: 'POST',
        body: formData
      });

    } catch (err: any) {
      console.error("Error showing rating in TG bot:", err.message);
      if (!messageId) {
        await fetch(\`https://api.telegram.org/bot\${this.token}/sendMessage\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: \`⚠️ *Ошибка при получении рейтинга.*\\n\\nПожалуйста, попробуйте позже.\`,
            parse_mode: 'Markdown'
          })
        });
      }
    }
  }`;

content = content.replace(showRatingRegex, newShowRatingCode);
fs.writeFileSync(file, content);
console.log("Patched rating page.");
