const fs = require('fs');
let code = fs.readFileSync('src/components/Teams.tsx', 'utf8');

// 1. Fix handleSaveTeam
code = code.replace(
`    window.dispatchEvent(new Event("db-user-updated"));
    
    fetch('/api/sync-cache', {`,
`    window.dispatchEvent(new Event("db-user-updated"));
    
    if (user && !user.isLocalDemo) {
        if (editingTeamId) {
            const tToSave = updatedTeams.find(t => t.id === editingTeamId);
            if (tToSave) {
                updateDoc(doc(db, 'teams', editingTeamId), tToSave).catch(e => console.warn(e));
            }
        } else {
            const newT = updatedTeams[updatedTeams.length - 1];
            if (newT) {
                setDoc(doc(db, 'teams', newT.id), newT).catch(e => console.warn(e));
            }
        }
    }
    
    fetch('/api/sync-cache', {`
);

// 2. Fix handleDeleteTeam
code = code.replace(
`    if (user && !user.isLocalDemo) {
      fetch('/api/sync-cache', {`,
`    if (user && !user.isLocalDemo) {
      deleteDoc(doc(db, 'teams', id)).catch(e => console.warn(e));
      fetch('/api/sync-cache', {`
);

fs.writeFileSync('src/components/Teams.tsx', code);
console.log("Patched Teams.tsx");
