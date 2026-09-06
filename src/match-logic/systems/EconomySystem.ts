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
    
    const isMR12 = state.format === 'MR12';
    const regMax = isMR12 ? 24 : 30;
    const isOT = state.round > regMax;

    if (loser) {
      loser.lossStreak = Math.min(5, (loser.lossStreak || 0) + 1);
    }
    if (winner) {
      // In CS2 post-2019 economy rules, winning a round reduces the loss counter by 1, rather than resetting to 0
      winner.lossStreak = Math.max(0, (winner.lossStreak || 0) - 1);
    }

    let lossMoney = 1400 + Math.max(0, (loser?.lossStreak || 1) - 1) * 500;
    lossMoney = Math.min(3400, lossMoney);

    // T bomb plant bonus: +$800 to every T player if bomb was planted even if round is lost
    const tBombBonus = (loser?.side === 'T' && (reason === 'DEFUSE' || state.bomb.state === 'DEFUSED' || state.bomb.state === 'EXPLODED')) ? 800 : 0;

    // In Overtime, both teams always receive maximum loss bonus ($3,400)
    if (isOT) {
      lossMoney = 3400;
    }

    if (winner.players) {
      for (const pId of winner.players) {
        const p = state.players[pId];
        if (p) p.money = Math.min(16000, p.money + winMoney);
      }
    }

    if (loser && loser.players) {
      const scoreDiff = (winner?.score || 0) - (loser?.score || 0);
      for (const pId of loser.players) {
        const p = state.players[pId];
        if (!p) continue;
        let totalBonus = lossMoney + tBombBonus;
        if (scoreDiff >= 3) {
          // Anti-snowball tactical economy: ensures trailing team has budget for rifles and armor
          totalBonus += Math.min(750, (scoreDiff - 2) * 250);
        }
        if (p.alive && p.side === 'CT' && reason === 'TIME') {
          // 0 loss bonus if CT survives and time runs out
        } else {
          p.money = Math.min(16000, p.money + totalBonus);
        }
        if (isOT) {
          p.money = Math.max(4500, p.money);
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
      const roundInHalf = ((state.round - 1) % (state.format === 'MR12' ? 12 : 15)) + 1;
      
      const fullBuyThreshold = team.side === 'T' ? 2700 : 3100;
      
      if (roundInHalf === 1) {
        type = 'ECO';
      } else if (roundInHalf === 2) {
        if (avgMoney >= fullBuyThreshold) {
          type = 'FULL_BUY';
        } else {
          type = 'FORCE_BUY';
        }
      } else if (roundInHalf === 3) {
        if (avgMoney >= fullBuyThreshold) {
          type = 'FULL_BUY';
        } else {
          // Hard save on Round 3 after round 2 force-buy loss to guarantee full gun round 4
          type = 'ECO';
        }
      } else {
        if (avgMoney >= fullBuyThreshold) {
          type = 'FULL_BUY';
        } else if ((team.lossStreak || 0) >= 3 && avgMoney >= 2000) {
          type = 'FORCE_BUY';
        } else if (avgMoney >= 2300 && (team.lossStreak || 0) <= 1) {
          type = 'HALF_BUY';
        } else {
          type = 'ECO';
        }
      }
      
      team.tactic = type;

      // CS2 Pro Team Economy: Teammates pool funds/drop for the sniper if sniper is close to AWP ($4,750)
      const sniperId = team.players.find(id => {
        const p = state.players[id];
        if (!p) return false;
        const r = (p.role || '').toLowerCase();
        return r.includes('sniper') || r.includes('awp') || r.includes('снайпер') || r.includes('авапер');
      });

      // Captain / IGL: in competitive CS, captains drop weapons and funds for star fraggers (AWP, AK-47, M4)
      const iglId = team.players.find(id => {
        const p = state.players[id];
        if (!p) return false;
        const r = (p.role || '').toLowerCase();
        return r.includes('igl') || r.includes('captain') || r.includes('капитан') || r.includes('кэп') || r.includes('leader');
      });

      if (sniperId && (type === 'FULL_BUY' || type === 'HALF_BUY' || type === 'FORCE_BUY')) {
        const sniper = state.players[sniperId];
        if (sniper && sniper.money < 4750 && sniper.money >= 1400 && !sniper.primaryWeaponId) {
          const needed = 4750 - sniper.money;
          // IGL is the primary donor for the sniper's AWP
          const donorId = (iglId && iglId !== sniperId && state.players[iglId] && state.players[iglId].money >= (1400 + needed))
            ? iglId
            : team.players.find(id => id !== sniperId && state.players[id] && state.players[id].money >= (3200 + needed));
          if (donorId) {
            state.players[donorId].money -= needed;
            sniper.money += needed;
          }
        }
      }

      // Captain dropping rifles to star fraggers on buy rounds:
      if (iglId && (type === 'FULL_BUY' || type === 'HALF_BUY')) {
        const igl = state.players[iglId];
        if (igl && igl.money >= 3500) {
          const rifleCost = team.side === 'T' ? 2700 : 2900;
          const starPlayerId = team.players.find(id => {
            if (id === iglId || id === sniperId) return false;
            const p = state.players[id];
            if (!p) return false;
            return p.money < (rifleCost + 650) && !p.primaryWeaponId;
          });
          if (starPlayerId) {
            const star = state.players[starPlayerId];
            const needed = (rifleCost + 650) - star.money;
            if (igl.money >= (1500 + needed)) {
              igl.money -= needed;
              star.money += needed;
            }
          }
        }
      }
      
      for (const playerId of team.players) {
        const p = state.players[playerId];
        if (!p) continue;
        
        const rLower = (p.role || '').toLowerCase().trim();
        const isSniper = rLower.includes('sniper') || rLower.includes('awp') || rLower.includes('снайпер') || rLower.includes('авапер');
        
        const hasSavedRifle = Boolean(p.primaryWeaponId && (WEAPONS[p.primaryWeaponId]?.type === 'RIFLE' || WEAPONS[p.primaryWeaponId]?.type === 'SNIPER'));
        let budget = p.money;
        
        if (type === 'ECO') {
            // Eco round: buy cheap pistol if afford, keep money for next round
            if (budget >= 2000) {
                p.secondaryWeaponId = 'p250';
                budget -= 300;
            } else {
                p.secondaryWeaponId = team.side === 'T' ? 'glock' : 'usp';
            }
            if (!hasSavedRifle) p.primaryWeaponId = null;
        } else if (type === 'FORCE_BUY') {
            // Force buy: Must prioritize Armor ($650 or $1000) + weapon
            if (!hasSavedRifle) {
                if (budget >= 3700 && team.side === 'T') {
                    p.armor = 2; budget -= 1000;
                    p.primaryWeaponId = 'ak47'; budget -= 2700;
                } else if (budget >= 3900 && team.side === 'CT') {
                    p.armor = 2; budget -= 1000;
                    p.primaryWeaponId = 'm4a1s'; budget -= 2900;
                } else if (budget >= 2800 && team.side === 'T') {
                    p.armor = 2; budget -= 1000;
                    p.primaryWeaponId = 'galil'; budget -= 1800;
                } else if (budget >= 3050 && team.side === 'CT') {
                    p.armor = 2; budget -= 1000;
                    p.primaryWeaponId = 'famas'; budget -= 2050;
                } else if (budget >= 2350 && isSniper) {
                    p.armor = 1; budget -= 650;
                    p.primaryWeaponId = 'ssg08'; budget -= 1700;
                } else if (budget >= 2250 && team.side === 'CT') {
                    p.armor = 2; budget -= 1000;
                    p.primaryWeaponId = 'mp9'; budget -= 1250;
                } else if (budget >= 2050 && team.side === 'T') {
                    p.armor = 2; budget -= 1000;
                    p.primaryWeaponId = 'mac10'; budget -= 1050;
                } else if (budget >= 1700) {
                    p.armor = 1; budget -= 650;
                    p.primaryWeaponId = team.side === 'CT' ? 'mp9' : 'mac10'; budget -= (team.side === 'CT' ? 1250 : 1050);
                } else if (budget >= 1350) {
                    p.armor = 1; budget -= 650;
                    p.secondaryWeaponId = 'deagle'; budget -= 700;
                    p.primaryWeaponId = null;
                } else if (budget >= 950) {
                    p.armor = 1; budget -= 650;
                    p.secondaryWeaponId = 'p250'; budget -= 300;
                    p.primaryWeaponId = null;
                } else {
                    p.primaryWeaponId = null;
                    p.secondaryWeaponId = team.side === 'T' ? 'glock' : 'usp';
                }
            } else {
                if (budget >= 1000 && p.armor < 2) { p.armor = 2; budget -= 1000; }
                else if (budget >= 650 && p.armor < 1) { p.armor = 1; budget -= 650; }
            }
        } else {
            // FULL_BUY or HALF_BUY
            if (!hasSavedRifle) {
                let desiredWeapon = this.decideWeapon(p.role, type, team.side, budget);
                let cost = WEAPONS[desiredWeapon]?.price || 0;
                if (budget >= cost + 650) {
                    if (WEAPONS[desiredWeapon]?.type === 'PISTOL') {
                        p.secondaryWeaponId = desiredWeapon;
                        p.primaryWeaponId = null;
                    } else {
                        p.primaryWeaponId = desiredWeapon;
                    }
                    budget -= cost;
                } else {
                    // Fallbacks with armor
                    const fallbacks = team.side === 'T' 
                      ? (isSniper ? ['ak47', 'galil', 'ssg08', 'mac10', 'deagle'] : ['ak47', 'galil', 'mac10', 'deagle'])
                      : (isSniper ? ['m4a1s', 'm4a4', 'famas', 'ssg08', 'mp9', 'deagle'] : ['m4a1s', 'm4a4', 'famas', 'mp9', 'deagle']);
                    let bought = false;
                    for (const fb of fallbacks) {
                        const fbCost = WEAPONS[fb]?.price || 0;
                        if (budget >= fbCost) {
                            if (WEAPONS[fb]?.type === 'PISTOL') {
                                p.secondaryWeaponId = fb;
                                p.primaryWeaponId = null;
                            } else {
                                p.primaryWeaponId = fb;
                            }
                            budget -= fbCost;
                            bought = true;
                            break;
                        }
                    }
                    if (!bought) {
                        p.primaryWeaponId = null;
                        p.secondaryWeaponId = team.side === 'T' ? 'glock' : 'usp';
                    }
                }
            }

            // Buy armor
            if (budget >= 1000 && p.armor < 2) { p.armor = 2; budget -= 1000; }
            else if (budget >= 650 && p.armor < 1) { p.armor = 1; budget -= 650; }
            
            if (p.side === 'CT' && !p.hasDefuseKit && budget >= 400) {
                p.hasDefuseKit = true; budget -= 400;
            }
            
            if (budget >= 600) {
                p.grenades = ['smoke', 'flash', 'he', 'molotov'];
                budget -= Math.min(budget, 600);
            } else if (budget >= 300) {
                p.grenades = ['he', 'flash'];
                budget -= 300;
            }
        }
        
        p.money = budget;
        p.weaponId = p.primaryWeaponId || p.secondaryWeaponId;
      }
    }
  }
  
  static decideWeapon(role: string, buyType: string, side: string, budget: number): string {
    if (buyType === 'ECO') return side === 'T' ? 'glock' : 'usp';
    
    const rLower = (role || '').toLowerCase().trim();
    const isSniper = rLower.includes('sniper') || rLower.includes('awp') || rLower.includes('снайпер') || rLower.includes('авапер');
    
    if (isSniper) {
        if (budget >= 4750) return 'awp';
        if (budget >= 2700 + 650 && side === 'T') return 'ak47';
        if (budget >= 2900 + 650 && side === 'CT') return 'm4a1s';
        if (budget >= 1700 + 650) return 'ssg08';
        if (budget >= 2700 && side === 'T') return 'ak47';
        if (budget >= 2900 && side === 'CT') return 'm4a1s';
        if (budget >= 1800 && side === 'T') return 'galil';
        if (budget >= 2050 && side === 'CT') return 'famas';
        if (budget >= 1700) return 'ssg08';
        if (budget >= 700) return 'deagle';
        return side === 'T' ? 'glock' : 'usp';
    }
    
    if (budget >= 2700 + 650 && side === 'T') return 'ak47';
    if (budget >= 2900 + 650 && side === 'CT') return 'm4a1s';
    if (budget >= 1800 + 650 && side === 'T') return 'galil';
    if (budget >= 2050 + 650 && side === 'CT') return 'famas';
    if (budget >= 1250 + 650 && side === 'CT') return 'mp9';
    if (budget >= 1050 + 650 && side === 'T') return 'mac10';
    if (budget >= 700) return 'deagle';
    return side === 'T' ? 'glock' : 'usp';
  }
}
