const fs = require('fs');
console.log(fs.readFileSync('src/components/PlayerProfileModal.tsx', 'utf8').includes('localStorage.removeItem(`player_avatar_${editNickname'));
