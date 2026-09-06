const fs = require('fs');
const content = fs.readFileSync('src/match-logic/systems/CombatSystem.ts', 'utf8');

const oldResolve = `      damage = Math.floor(damage);
      target.hp -= damage;
      shooter.statistics.damage += damage;`;

const newResolve = `      damage = Math.floor(damage);
      target.hp -= damage;
      shooter.statistics.damage += damage;
      
      // Track who did damage
      if (!target.damageTaken) target.damageTaken = new Map();
      target.damageTaken.set(shooter.id, (target.damageTaken.get(shooter.id) || 0) + damage);`;

let newContent = content.replace(oldResolve, newResolve);

const oldKill = `    victim.statistics.deaths++;
    killer.statistics.kills++;
    if (isHeadshot) killer.statistics.headshots++;`;

const newKill = `    victim.statistics.deaths++;
    killer.statistics.kills++;
    if (isHeadshot) killer.statistics.headshots++;
    
    if (victim.damageTaken) {
      for (const [assistId, dmg] of victim.damageTaken.entries()) {
        if (assistId !== killer.id && dmg >= 40) {
           const assister = state.players[assistId];
           if (assister && assister.teamId === killer.teamId) {
             assister.statistics.assists++;
           }
        }
      }
    }`;
    
newContent = newContent.replace(oldKill, newKill);
fs.writeFileSync('src/match-logic/systems/CombatSystem.ts', newContent);
