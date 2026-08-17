const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

const startStr = "private async showRatingPage(chatId: string, page: number, messageId?: string) {";
const endStr = "  private async handleMessage(msg: any) {";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const newShowRatingCode = `private async showRatingPage(chatId: string, page: number, messageId?: string) {
    try {
      const teamsQuery = query(collection(db, 'teams'), where('channelId', '==', this.userId));
      const teamsSnapshot = await getDocs(teamsQuery);
      
      const fetchedTeams: any[] = [];
      teamsSnapshot.forEach((d) => {
        const data = d.data();
        const players = data.players || [];
        const totalValRating = data.totalValRating || players.reduce((acc: number, p: any) => acc + (p && p.id ? (Number(p.valRating) || 1000) : 0), 0);
        
        fetchedTeams.push({
          id: d.id,
          name: data.name || 'Неизвестная команда',
          totalValRating,
          players
        });
      });

      // Sort by total VAL rating descending
      fetchedTeams.sort((a, b) => b.totalValRating - a.totalValRating);

      const itemsPerPage = 10;
      const totalPages = Math.ceil(fetchedTeams.length / itemsPerPage);
      const currentPage = Math.max(1, Math.min(page, totalPages));
      
      let buttons: any[] = [];

      if (fetchedTeams.length === 0) {
        await fetch(\`https://api.telegram.org/bot\${this.token}/sendMessage\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: \`В вашей системе пока не создано ни одной команды! 🚫\\nСоздайте их в панели управления на сайте.\`,
            parse_mode: 'Markdown'
          })
        });
        return;
      }

      const startIndexP = (currentPage - 1) * itemsPerPage;
      const endIndexP = Math.min(startIndexP + itemsPerPage, fetchedTeams.length);
      const pageItems = fetchedTeams.slice(startIndexP, endIndexP);

      let rowsSvg = '';
      let y = 160;
      pageItems.forEach((t, i) => {
        const rank = startIndexP + i + 1;
        const rankColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#ffffff';
        // HTML encode team name just in case
        const safeName = t.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        const validPlayers = t.players.filter((p: any) => p && p.id);
        let playersStr = validPlayers.map((p: any) => p.nickname).join(', ');
        if (playersStr.length > 50) {
          playersStr = playersStr.substring(0, 47) + '...';
        }
        playersStr = playersStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (validPlayers.length === 0) {
            playersStr = 'Нет состава';
        }
        const playersColor = validPlayers.length === 0 ? '#666666' : '#aaaaaa';

        rowsSvg += \`
          <text x="50" y="\${y}" font-family="sans-serif" font-size="20" font-weight="bold" fill="\${rankColor}">\${rank}</text>
          <text x="110" y="\${y}" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff">\${safeName}</text>
          <text x="350" y="\${y}" font-family="sans-serif" font-size="18" fill="\${playersColor}">\${playersStr}</text>
          <text x="750" y="\${y}" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="end">\${t.totalValRating}</text>
          <line x1="40" y1="\${y + 15}" x2="760" y2="\${y + 15}" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1"/>
        \`;
        y += 45;
      });

      const svgHeight = 160 + (pageItems.length * 45) + 20;
      const svgString = \`
      <svg width="800" height="\${svgHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#12121a" rx="20"/>
        
        <text x="40" y="50" font-family="sans-serif" font-size="28" font-weight="bold" fill="#ffffff">ТАБЛИЦА VAC PTS</text>
        <text x="40" y="80" font-family="sans-serif" font-size="16" fill="#aaaaaa">Официальный рейтинг команд на основе суммарной силы состава</text>
        
        <rect x="40" y="100" width="720" height="30" fill="#000000" fill-opacity="0.4" rx="5"/>
        <text x="50" y="120" font-family="sans-serif" font-size="14" font-weight="bold" fill="#888888">#</text>
        <text x="110" y="120" font-family="sans-serif" font-size="14" font-weight="bold" fill="#888888">КОМАНДА</text>
        <text x="350" y="120" font-family="sans-serif" font-size="14" font-weight="bold" fill="#888888">СОСТАВ</text>
        <text x="750" y="120" font-family="sans-serif" font-size="14" font-weight="bold" fill="#888888" text-anchor="end">ОЧКИ</text>
        
        \${rowsSvg}
      </svg>\`;

      const imageBuffer = await sharp(Buffer.from(svgString)).png().toBuffer();

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
        await fetch(\`https://api.telegram.org/bot\${this.token}/deleteMessage\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, message_id: messageId })
        }).catch(e => console.error(e));
      }

      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', new Blob([imageBuffer], { type: 'image/png' }), 'rating.png');
      if (buttons.length > 0) {
        formData.append('reply_markup', JSON.stringify({ inline_keyboard: [row] }));
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
  }
\n`;

  content = content.substring(0, startIndex) + newShowRatingCode + content.substring(endIndex);
  fs.writeFileSync(file, content);
  console.log("Fixed!");
}
