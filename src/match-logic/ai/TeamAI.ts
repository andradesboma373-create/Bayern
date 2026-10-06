import { MatchState, Team, Player } from '../models';
import { CombatSystem } from '../systems/CombatSystem';

export class TeamAI {
  static update(state: MatchState) {
    for (const team of Object.values(state.teams)) {
      this.updateTeamStrategy(state, team);
    }
  }

  static updateTeamStrategy(state: MatchState, team: Team) {
    if (!team || !team.players) return;
    const alivePlayers = team.players.map(id => state.players[id]).filter(p => p && p.alive);
    if (alivePlayers.length === 0) return;

    if (state.tick === 51) {
      if (team.side === 'T') {
        const r = CombatSystem.random();
        if (team.tactic === 'ECO') {
            team.strategy = r > 0.5 ? 'FAST_A' : 'FAST_B'; 
        } else {
            if (r < 0.20) team.strategy = 'DEFAULT';
            else if (r < 0.40) team.strategy = 'MID_ROUND_HOLD'; // 20% chance to hold and look for picks
            else if (r < 0.55) team.strategy = 'EXECUTE_A';
            else if (r < 0.70) team.strategy = 'EXECUTE_B';
            else if (r < 0.82) team.strategy = 'MID_SPLIT_A';
            else if (r < 0.90) team.strategy = 'MID_SPLIT_B';
            else if (r < 0.95) team.strategy = 'FAST_A';
            else team.strategy = 'FAST_B';
        }
      } else {
        // CT Side Setup Strategies: adapt when trailing or to break opponent momentum
        const r = CombatSystem.random();
        if ((team.lossStreak || 0) >= 2) {
          if (r < 0.35) team.strategy = 'STACK_A';
          else if (r < 0.70) team.strategy = 'STACK_B';
          else if (r < 0.85) team.strategy = 'MID_CONTROL';
          else team.strategy = 'DEFAULT';
        } else {
          if (r < 0.15) team.strategy = 'STACK_A';
          else if (r < 0.30) team.strategy = 'STACK_B';
          else team.strategy = 'DEFAULT';
        }
      }
    }

    // Dynamic mid-round T calling if playing DEFAULT or MID_ROUND_HOLD
    if (team.side === 'T' && (team.strategy === 'DEFAULT' || team.strategy === 'MID_ROUND_HOLD') && state.tick >= 70) {
      const enemyKillsOnA = Object.values(state.players).filter(p => p.teamId !== team.id && !p.alive && (p.currentNodeId === 'a_site' || p.currentNodeId === 'jungle' || p.currentNodeId === 'connector')).length;
      const enemyKillsOnB = Object.values(state.players).filter(p => p.teamId !== team.id && !p.alive && (p.currentNodeId === 'b_site' || p.currentNodeId === 'short')).length;
      
      const shouldCommit = state.tick > 450 || (enemyKillsOnA + enemyKillsOnB) > 0;
      
      if (shouldCommit) {
        if (enemyKillsOnA > enemyKillsOnB) {
          team.strategy = 'EXECUTE_A';
        } else if (enemyKillsOnB > enemyKillsOnA) {
          team.strategy = 'EXECUTE_B';
        } else {
          team.strategy = CombatSystem.random() > 0.5 ? 'EXECUTE_A' : 'EXECUTE_B';
        }
      }
    }

    if (team.side === 'T') {
      if (state.bomb.state === 'PLANTED' || state.bomb.state === 'PLANTING') {
        team.strategy = 'DEFEND_BOMB';
      } else if (state.bomb.state === 'DROPPED') {
         team.strategy = 'RECOVER_BOMB';
      } else {
        // T-Side Saving Logic: if disadvantage is huge and time is low or just huge disadvantage
        let ctCount = 0;
        for (const id in state.players) {
          const p = state.players[id];
          if (p && p.teamId !== team.id && p.alive) ctCount++;
        }
        const tCount = alivePlayers.length;
        const disadvantage = ctCount - tCount;
        
        // If 1v3, 1v4, 2v5 etc. and someone has an AWP/Rifle, they might decide to save
        const expensiveWeapons = ['awp', 'ak47', 'm4a1s', 'm4a4', 'aug', 'sg553'];
        const hasExpensiveWeapon = alivePlayers.some(p => p.primaryWeaponId && expensiveWeapons.includes(p.primaryWeaponId));
        
        if (tCount <= 2 && disadvantage >= 2 && hasExpensiveWeapon) {
          let tSaveChance = 0.5;
          if (tCount === 1 && disadvantage >= 3) tSaveChance = 0.9;
          if (state.tick > 750) tSaveChance += 0.15; // Late round, low hope
          
          if (CombatSystem.random() < tSaveChance) {
            team.strategy = 'SAVE';
          }
        }
      }
    } else {
      if ((state.bomb.state === 'PLANTED' || state.bomb.state === 'PLANTING') && team.strategy !== 'SAVE' && team.strategy !== 'RETAKE') {
        let tCount = 0;
        for (const id in state.players) {
          const p = state.players[id];
          if (p && p.teamId !== team.id && p.alive) tCount++;
        }
        const ctCount = alivePlayers.length;
        
        if (ctCount === 0) return;
        
        const disadvantage = tCount - ctCount;
        let saveChance = 0;
        if (disadvantage >= 3) saveChance = 0.85;
        else if (disadvantage === 2) saveChance = 0.65;
        else if (disadvantage === 1) saveChance = 0.25;
        
        if (team.tactic === 'ECO') saveChance -= 0.6; 
        else if (team.tactic === 'FULL_BUY') saveChance += 0.15; 
        
        if (CombatSystem.random() < saveChance) {
            team.strategy = 'SAVE';
        } else {
            team.strategy = 'RETAKE';
        }
      }
    }
  }
}
