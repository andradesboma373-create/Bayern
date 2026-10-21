import { Team, Match, TournamentStageConfig, Tournament } from './types';
import { generateSingleEliminationBracket, generateDoubleElimination } from './doubleEliminationLogic';
import { generateGslGroups } from './gslLogic';
import { generateNextSwissRound } from './swissLogic';

export function getBracketQualifiedTeams(bracket: Match[][]): Team[] {
  if (!Array.isArray(bracket) || bracket.length === 0) return [];
  const finalRound = bracket[bracket.length - 1];
  if (!Array.isArray(finalRound)) return [];

  const qualified: Team[] = [];
  for (const m of finalRound) {
    if (m && m.winnerId) {
      const winner = m.team1?.id === m.winnerId ? m.team1 : m.team2?.id === m.winnerId ? m.team2 : null;
      if (winner && winner.id !== 'BYE' && !qualified.some(q => q.id === winner.id)) {
        qualified.push(winner);
      }
    }
  }
  return qualified;
}

export function generateStageData(
  stageType: string,
  teams: Team[],
  settings: any = {}
): Partial<TournamentStageConfig> {
  const type = stageType || 'playoff';

  if (type === 'double_elim' || settings.eliminationType === 'double') {
    const res = generateDoubleElimination(teams);
    return {
      type: 'playoff',
      eliminationType: 'double',
      bracketRounds: res.winnersBracket,
      losersBracketRounds: res.losersBracket,
      grandFinal: res.grandFinal,
      teams
    };
  }

  if (type === 'groups') {
    const groupCount = settings.groupCount || 2;
    const groups: any[] = [];
    for (let i = 0; i < groupCount; i++) {
      const gTeams: Team[] = [];
      for (let j = i; j < teams.length; j += groupCount) {
        if (teams[j]) gTeams.push(teams[j]);
      }
      const matches: Match[] = [];
      for (let a = 0; a < gTeams.length; a++) {
        for (let b = a + 1; b < gTeams.length; b++) {
          matches.push({
            id: `g${i}-m${a}-${b}`,
            team1: gTeams[a],
            team2: gTeams[b],
            score1: 0,
            score2: 0,
            winnerId: null
          });
        }
      }
      groups.push({
        name: `Группа ${String.fromCharCode(65 + i)}`,
        teams: gTeams,
        matches
      });
    }
    return { type: 'groups', groups, teams };
  }

  if (type === 'gsl_groups') {
    const gsl = generateGslGroups(teams, settings.gslGroupCount || 2, undefined, settings.gslAdvanceCount || 3);
    return { type: 'gsl_groups', gslGroups: gsl, teams };
  }

  if (type === 'swiss') {
    const round0 = generateNextSwissRound(teams, [], settings.swissWinsToAdvance || 3, settings.swissLossesToEliminate || 3);
    return { type: 'swiss', swissRounds: round0 ? [round0] : [], teams };
  }

  if (type === 'qualifier') {
    const numQualifiers = settings.numQualifiers || 2;
    const brackets: Match[][][] = [];
    const teamsPer = Math.ceil(teams.length / numQualifiers);
    for (let i = 0; i < numQualifiers; i++) {
      const qTeams = teams.slice(i * teamsPer, (i + 1) * teamsPer);
      brackets.push(generateSingleEliminationBracket(qTeams));
    }
    return { type: 'qualifier', qualifiersBrackets: brackets, teams };
  }

  // Default: Single Elimination Playoff
  const rounds = generateSingleEliminationBracket(teams);
  return {
    type: 'playoff',
    eliminationType: 'single',
    bracketRounds: rounds,
    teams
  };
}

export function getStageAdvancingTeams(stage: any): Team[] {
  if (!stage) return [];
  const teams: Team[] = [];

  if (stage.type === 'qualifier' && Array.isArray(stage.qualifiersBrackets)) {
    for (const b of stage.qualifiersBrackets) {
      const q = getBracketQualifiedTeams(b);
      teams.push(...q);
    }
    return teams;
  }

  if (stage.bracketRounds && stage.bracketRounds.length > 0) {
    const finalRound = stage.bracketRounds[stage.bracketRounds.length - 1];
    if (finalRound && finalRound[0]?.winnerId) {
      const m = finalRound[0];
      const w = m.team1?.id === m.winnerId ? m.team1 : m.team2;
      if (w && w.id !== 'BYE') teams.push(w);
    }
  }

  return teams;
}

export function advanceTeamsToStage(
  tournament: Tournament,
  fromStageIndex: number,
  toStageIndex: number
): Tournament {
  const stages = tournament.settings?.stages || [];
  if (!stages[fromStageIndex] || !stages[toStageIndex]) return tournament;

  const advancing = getStageAdvancingTeams(stages[fromStageIndex]);
  if (advancing.length === 0) return tournament;

  const targetStage = stages[toStageIndex];
  const updatedStageData = generateStageData(
    targetStage.type || 'playoff',
    advancing,
    tournament.settings
  );

  const newStages = [...stages];
  newStages[toStageIndex] = {
    ...targetStage,
    ...updatedStageData,
    teams: advancing
  };

  return {
    ...tournament,
    activeStage: toStageIndex + 1,
    settings: {
      ...tournament.settings,
      stages: newStages
    }
  };
}
