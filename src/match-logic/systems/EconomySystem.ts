import { MatchState, Player, Team } from '../models';
import { WEAPONS } from '../config/Weapons';

export class EconomySystem {
  static distributeRoundEndMoney(state: MatchState, winnerTeamId: string, reason: string) {
    const winner = state.teams[winnerTeamId];
    const loserTeamId = Object.keys(state.teams).find(id => id !== winnerTeamId);
    const loser = loserTeamId ? state.teams[loserTeamId] : null;
    
    if (!winner) return;

    let winMoney = 3250;
    if (reason === 'DEFUSE' || reason === 'EXPLOSION') winMoney = 3500;
    
    if (loser) {
      loser.lossStreak = (loser.lossStreak || 0) + 1;
    }
    winner.lossStreak = 0;
    let lossMoney = 1400 + ((loser?.lossStreak || 1) - 1) * 500;
    lossMoney = Math.min(3400, lossMoney);

    if (winner.players) {
      for (const pId of winner.players) {
          const p = state.players[pId];
          if (p) p.money = Math.min(16000, p.money + winMoney);
      }
    }

    if (loser && loser.players) {
      for (const pId of loser.players) {
          const p = state.players[pId];
          if (!p) continue;
          if (p.alive && p.side === 'CT' && reason === 'TIME') {
               // 0 loss bonus if CT survives and time runs out
          } else if (p.alive && loser.strategy === 'SAVE') {
               p.money = Math.min(16000, p.money + lossMoney);
          } else {
               p.money = Math.min(16000, p.money + lossMoney);
          }
      }
    }
  }

  static processBuyPhase(state: MatchState) {
    for (const teamId in state.teams) {
      const team = state.teams[teamId];
      if (!team || !team.players) continue;
      
      let teamMoney = 0;
      team.players.forEach(pId => {
        if (state.players[pId]) teamMoney += state.players[pId].money || 0;
      });
      const avgMoney = teamMoney / 5;
      
      let type = 'ECO';
      if (avgMoney >= 4100) type = 'FULL_BUY';
      else if (avgMoney >= 3300) type = 'HALF_BUY';
      else if (avgMoney >= 2400) type = 'FORCE_BUY';
      
      team.tactic = type;
      
      for (const playerId of team.players) {
        const p = state.players[playerId];
        if (!p) continue;
        
        let keepWeapon = false;
        if (p.alive && p.primaryWeaponId) {
            const w = WEAPONS[p.primaryWeaponId];
            if (w && (w.type === 'RIFLE' || w.type === 'SNIPER')) {
                keepWeapon = true;
            }
        }
        
        if (!p.alive) {
           p.primaryWeaponId = null;
           p.secondaryWeaponId = p.side === 'T' ? 'glock' : 'usp';
           p.armor = 0;
           p.hasDefuseKit = false;
           p.grenades = [];
        }
        
        let budget = p.money;
        
        if (type !== 'ECO') {
            if (budget >= 1000 && p.armor < 2) { p.armor = 2; budget -= 1000; }
            else if (budget >= 650 && p.armor < 1) { p.armor = 1; budget -= 650; }
        }
        
        if (p.side === 'CT' && !p.hasDefuseKit && budget >= 400 && type !== 'ECO') {
            p.hasDefuseKit = true; budget -= 400;
        }
        
        if (!keepWeapon) {
            let desiredWeapon = this.decideWeapon(p.role, type, team.side);
            let cost = WEAPONS[desiredWeapon]?.price || 0;
            if (budget >= cost) {
                p.primaryWeaponId = desiredWeapon;
                budget -= cost;
            } else {
                desiredWeapon = p.side === 'T' ? 'mac10' : 'mp9';
                cost = WEAPONS[desiredWeapon]?.price || 0;
                if (budget >= cost) {
                    p.primaryWeaponId = desiredWeapon;
                    budget -= cost;
                } else {
                    p.secondaryWeaponId = 'p250';
                    budget -= 300;
                }
            }
        }
        
        if (type === 'FULL_BUY' && budget >= 1000) {
            p.grenades = ['smoke', 'flash', 'molotov'];
            budget -= 900;
        }
        
        p.money = budget;
        p.weaponId = p.primaryWeaponId || p.secondaryWeaponId;
      }
    }
  }
  
  static decideWeapon(role: string, buyType: string, side: string): string {
    if (buyType === 'ECO') return side === 'T' ? 'glock' : 'usp';
    if (buyType === 'FORCE_BUY') return 'deagle';
    if (buyType === 'HALF_BUY') return side === 'T' ? 'galil' : 'famas';
    const rLower = (role || '').toLowerCase().trim();
    if (rLower === 'sniper' || rLower === 'awper' || rLower === 'awp' || rLower === 'снайпер' || rLower === 'авапер') return 'awp';
    return side === 'T' ? 'ak47' : 'm4a1s';
  }
}
