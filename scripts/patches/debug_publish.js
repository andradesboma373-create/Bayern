// A small test to see if something is wrong with the newType logic
const newType = 'roster_announcement';
const selectedTeamId = '';
const selectedPlayerId = '';

if ((newType === 'player_transfer' || newType === 'welcome_player') && (!selectedTeamId || !selectedPlayerId)) {
  console.log("error 1");
}

if (newType === 'roster_announcement' && !selectedTeamId) {
  console.log("error 2");
}

