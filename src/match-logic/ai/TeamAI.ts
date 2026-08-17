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
            if (r < 0.35) team.strategy = 'EXECUTE_A';
            else if (r < 0.65) team.strategy = 'EXECUTE_B';
            else if (r < 0.80) team.strategy = 'MID_SPLIT_A';
            else if (r < 0.92) team.strategy = 'MID_SPLIT_B';
            else if (r < 0.96) team.strategy = 'FAST_A';
            else team.strategy = 'FAST_B';
        }
      } else {
        team.strategy = 'DEFAULT';
      }
    }

    if (team.side === 'T') {
      if (state.bomb.state === 'PLANTED' || state.bomb.state === 'PLANTING') {
        team.strategy = 'DEFEND_BOMB';
      } else if (state.bomb.state === 'DROPPED') {
         team.strategy = 'RECOVER_BOMB';
      }
    } else {
      if (state.bomb.state === 'PLANTED' || state.bomb.state === 'PLANTING') {
        const tCount = Object.values(state.players).filter(p => p.teamId !== team.id && p.alive).length;
        const ctCount = alivePlayers.length;
        
        if (ctCount === 0) return;
        
        const disadvantage = tCount - ctCount;
        let saveChance = 0;
        if (disadvantage >= 2) saveChance = 0.5;
        else if (disadvantage === 1) saveChance = 0.15;
        
        if (team.tactic === 'ECO') saveChance -= 0.5; 
        else if (team.tactic === 'FULL_BUY') saveChance += 0.2; 
        
        if (team.strategy !== 'SAVE' && team.strategy !== 'RETAKE') {
            if (CombatSystem.random() < saveChance) {
                team.strategy = 'SAVE';
            } else {
                team.strategy = 'RETAKE';
            }
        }
      }
    }
  }
}
