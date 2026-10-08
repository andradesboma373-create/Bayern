import { TournamentStageConfig, Team, Match, Group, GslGroup, Tournament } from './types';
import { 
  generateSingleEliminationBracket, 
  generateDoubleElimination, 
  getBalancedSeeding,
  BYE_TEAM 
} from './doubleEliminationLogic';
import { generateGslGroups } from './gslLogic';
import { generateNextSwissRound } from './swissLogic';
import { shuffleArray } from '../../lib/utils';

export interface StageBuildResult {
  bracketRounds?: Match[][];
  losersBracketRounds?: Match[][];
  grandFinal?: Match[];
  groups?: Group[];
  gslGroups?: GslGroup[];
  swissRounds?: Match[][];
  qualifiersBrackets?: Match[][][];
}

/**
 * Generates matches and brackets for a specific stage based on its type and roster
 */
export function generateStageData(
  stageType: 'playoff' | 'qualifier' | 'gsl_groups' | 'swiss' | 'groups',
  teams: Team[],
  options?: {
    eliminationType?: 'single' | 'double';
    seedingType?: 'random' | 'manual' | 'skill';
    numberOfGroups?: number;
    matchesPerPairing?: 1 | 2;
    gslAdvanceCount?: 2 | 3 | 4;
    swissWinsToAdvance?: number;
    swissLossesToEliminate?: number;
    numQuals?: number;
    advancePerQual?: number;
    groupAssignments?: Record<string, string[]>;
  }
): StageBuildResult {
  const result: StageBuildResult = {};
  if (!Array.isArray(teams) || teams.length === 0) {
    return result;
  }

  const seeding = options?.seedingType || 'manual';
  let orderedTeams = [...teams];
  if (seeding === 'random') {
    orderedTeams = shuffleArray(orderedTeams);
  } else if (seeding === 'skill') {
    orderedTeams = getBalancedSeeding(orderedTeams);
  }

  if (stageType === 'playoff') {
    if (options?.eliminationType === 'double') {
      const res = generateDoubleElimination(orderedTeams);
      result.bracketRounds = res.winnersBracket;
      result.losersBracketRounds = res.losersBracket;
      result.grandFinal = res.grandFinal;
    } else {
      result.bracketRounds = generateSingleEliminationBracket(orderedTeams);
    }
  } else if (stageType === 'gsl_groups') {
    const numGroups = options?.numberOfGroups || (teams.length >= 16 ? 4 : 2);
    const advanceCount = options?.gslAdvanceCount || 2;
    result.gslGroups = generateGslGroups(orderedTeams, numGroups, options?.groupAssignments, advanceCount);
  } else if (stageType === 'groups') {
    const numGroups = options?.numberOfGroups || 2;
    const initialGroups: Group[] = [];
    for (let i = 0; i < numGroups; i++) {
      initialGroups.push({
        id: `group-${i}`,
        name: `Группа ${String.fromCharCode(65 + i)}`,
        teams: [],
        matches: []
      });
    }

    if (options?.groupAssignments && Object.keys(options.groupAssignments).length > 0) {
      const teamMap = new Map(orderedTeams.map(t => [t.id, t]));
      initialGroups.forEach((grp, idx) => {
        const assignedIds = options.groupAssignments![grp.id] || options.groupAssignments![`gsl-group-${idx}`] || [];
        assignedIds.forEach(tId => {
          const tObj = teamMap.get(tId);
          if (tObj) grp.teams.push(tObj);
        });
      });
    } else {
      orderedTeams.forEach((team, idx) => {
        initialGroups[idx % numGroups].teams.push(team);
      });
    }

    // Generate round robin matches
    initialGroups.forEach(group => {
      const matches: Match[] = [];
      for (let i = 0; i < group.teams.length; i++) {
        for (let j = i + 1; j < group.teams.length; j++) {
          matches.push({
            id: `m-${group.id}-${i}-${j}-1`,
            team1: group.teams[i],
            team2: group.teams[j],
            score1: 0,
            score2: 0,
            winnerId: null
          });
          if (options?.matchesPerPairing === 2) {
            matches.push({
              id: `m-${group.id}-${i}-${j}-2`,
              team1: group.teams[j],
              team2: group.teams[i],
              score1: 0,
              score2: 0,
              winnerId: null
            });
          }
        }
      }
      group.matches = matches;
    });

    result.groups = initialGroups;
  } else if (stageType === 'swiss') {
    const firstRound = generateNextSwissRound(
      orderedTeams, 
      [], 
      options?.swissWinsToAdvance || 3, 
      options?.swissLossesToEliminate || 3
    );
    if (firstRound) {
      result.swissRounds = [firstRound];
    }
  } else if (stageType === 'qualifier') {
    const numQuals = options?.numQuals || 1;
    const brackets: Match[][][] = [];

    // В соответствии с турнирными правилами:
    // Все команды, приглашенные в стадию квалификаций, начинают играть в 1-й квалификации!
    if (orderedTeams.length > 0) {
      brackets.push(generateSingleEliminationBracket(orderedTeams));
    } else {
      brackets.push([]);
    }

    // Последующие квалификации (2-я, 3-я и т.д.) изначально пустые и формируются
    // последовательно только после завершения предыдущих, БЕЗ команд, которые уже прошли!
    for (let q = 1; q < numQuals; q++) {
      brackets.push([]);
    }

    result.qualifiersBrackets = brackets;
  }

  return result;
}

/**
 * Transfers qualifying teams from one stage to the next stage, merging with waiting invitees
 */
export function advanceTeamsToStage(
  tournament: Tournament,
  sourceStageIdx: number,
  targetStageIdx: number,
  teamsToAdvance: Team[]
): Tournament {
  if (!tournament.settings?.stages || !tournament.settings.stages[targetStageIdx]) {
    return tournament;
  }

  const updatedTournament: Tournament = JSON.parse(JSON.stringify(tournament));
  const stages = updatedTournament.settings.stages!;
  const targetStage = stages[targetStageIdx];

  // Existing teams that are waiting in the target stage
  const waitingTeams = targetStage.teams || [];
  const existingNames = new Set(waitingTeams.map(t => t.name.toLowerCase()));

  // Add advancing teams if not already present
  const newAdvancing = teamsToAdvance.filter(t => !existingNames.has(t.name.toLowerCase()));
  const mergedTeams = [...waitingTeams, ...newAdvancing];

  targetStage.teams = mergedTeams;

  // Re-generate matches for the target stage with merged teams
  const built = generateStageData(targetStage.type, mergedTeams, {
    eliminationType: updatedTournament.settings.eliminationType,
    numberOfGroups: updatedTournament.settings.numberOfGroups,
    matchesPerPairing: updatedTournament.settings.matchesPerPairing,
    gslAdvanceCount: updatedTournament.settings.gslAdvanceCount,
    swissWinsToAdvance: updatedTournament.settings.swissWinsToAdvance,
    swissLossesToEliminate: updatedTournament.settings.swissLossesToEliminate,
    numQuals: targetStage.numQuals || updatedTournament.settings.numQuals,
    advancePerQual: targetStage.advancePerQual || updatedTournament.settings.advancePerQual
  });

  targetStage.bracketRounds = built.bracketRounds;
  targetStage.losersBracketRounds = built.losersBracketRounds;
  targetStage.grandFinal = built.grandFinal;
  targetStage.groups = built.groups;
  targetStage.gslGroups = built.gslGroups;
  targetStage.swissRounds = built.swissRounds;
  targetStage.qualifiersBrackets = built.qualifiersBrackets;

  // Switch activeStage to target stage
  updatedTournament.activeStage = targetStageIdx + 1;

  // Update root-level fields if this is now active stage
  if (built.bracketRounds) updatedTournament.bracketRounds = built.bracketRounds;
  if (built.losersBracketRounds) updatedTournament.losersBracketRounds = built.losersBracketRounds;
  if (built.grandFinal) updatedTournament.grandFinal = built.grandFinal;
  if (built.groups) updatedTournament.groups = built.groups;
  if (built.gslGroups) updatedTournament.gslGroups = built.gslGroups;
  if (built.swissRounds) updatedTournament.swissRounds = built.swissRounds;
  if (built.qualifiersBrackets) updatedTournament.qualifiersBrackets = built.qualifiersBrackets;

  return updatedTournament;
}

/**
 * Extracts qualified teams from a single-elimination qualifier bracket based on advancePerQual
 */
export function getBracketQualifiedTeams(bracket: Match[][], advancePerQual: number = 1): Team[] {
  if (!bracket || !Array.isArray(bracket) || bracket.length === 0) return [];
  const result: Team[] = [];
  const seenIds = new Set<string>();

  const addTeam = (t?: Team | null) => {
    if (t && t.id && t.id !== 'BYE' && !seenIds.has(t.id)) {
      seenIds.add(t.id);
      result.push(t);
    }
  };

  // Case 1: 1 team advances -> ONLY the winner of the grand final (last round)
  if (advancePerQual === 1) {
    const finalRound = bracket[bracket.length - 1];
    if (finalRound && finalRound.length > 0) {
      const finalMatch = finalRound[0];
      if (finalMatch && finalMatch.winnerId) {
        const winTeam = finalMatch.winnerId === finalMatch.team1?.id ? finalMatch.team1 : finalMatch.team2;
        addTeam(winTeam);
      }
    }
    return result;
  }

  // Case 2: 2 teams advance -> The winners of BOTH semifinals (both must be finished!)
  if (advancePerQual === 2) {
    if (bracket.length === 1) {
      const m = bracket[0]?.[0];
      if (m && m.winnerId && m.team1 && m.team2) {
        addTeam(m.team1);
        addTeam(m.team2);
      }
      return result;
    }

    const semiRound = bracket[bracket.length - 2];
    if (semiRound && semiRound.length >= 2) {
      const semi1 = semiRound[0];
      const semi2 = semiRound[1];
      const isSemi1Done = !!(semi1 && semi1.winnerId);
      const isSemi2Done = !!(semi2 && semi2.winnerId);

      // CRITICAL: Only when BOTH semifinals are completed can we declare both teams qualified!
      // If 1 team won and the other semifinal is still playing, NO ONE has qualified yet.
      if (isSemi1Done && isSemi2Done) {
        const win1 = semi1.winnerId === semi1.team1?.id ? semi1.team1 : semi1.team2;
        const win2 = semi2.winnerId === semi2.team1?.id ? semi2.team1 : semi2.team2;
        addTeam(win1);
        addTeam(win2);
      }
    }
    return result;
  }

  // Case 3: N teams advance (e.g. 4 teams from quarterfinals)
  for (let r = 0; r < bracket.length; r++) {
    const round = bracket[r];
    if (round && round.length === advancePerQual) {
      const allFinished = round.every(m => m && m.winnerId);
      if (allFinished) {
        round.forEach(m => {
          const w = m.winnerId === m.team1?.id ? m.team1 : m.team2;
          addTeam(w);
        });
      }
      return result;
    }
  }

  return result;
}

/**
 * Extracts advancing or winning teams from a completed or in-progress stage
 */
export function getStageAdvancingTeams(stage: TournamentStageConfig): Team[] {
  if (!stage || !Array.isArray(stage.teams) || stage.teams.length === 0) {
    return [];
  }

  const winnersMap = new Map<string, Team>();

  // 1. Playoff / Bracket - only final match winner qualifies unless multi-slot specified
  if (stage.bracketRounds && stage.bracketRounds.length > 0) {
    const lastRound = stage.bracketRounds[stage.bracketRounds.length - 1];
    lastRound.forEach(m => {
      if (m && m.winnerId) {
        const winTeam = m.winnerId === m.team1?.id ? m.team1 : m.team2;
        if (winTeam && winTeam.id !== 'BYE') winnersMap.set(winTeam.id, winTeam);
      }
    });
  }

  // 2. Round Robin Groups
  if (stage.groups && stage.groups.length > 0) {
    stage.groups.forEach(g => {
      // Sort teams by wins
      const scores = new Map<string, number>();
      g.teams.forEach(t => scores.set(t.id, 0));
      g.matches.forEach(m => {
        if (m.winnerId && scores.has(m.winnerId)) {
          scores.set(m.winnerId, (scores.get(m.winnerId) || 0) + 3);
        }
      });
      const sorted = [...g.teams].sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
      // Advance top 2 teams
      sorted.slice(0, 2).forEach(t => winnersMap.set(t.id, t));
    });
  }

  // 3. GSL Groups
  if (stage.gslGroups && stage.gslGroups.length > 0) {
    stage.gslGroups.forEach(g => {
      g.teams.slice(0, 2).forEach(t => winnersMap.set(t.id, t));
    });
  }

  // 4. Swiss
  if (stage.swissRounds && stage.swissRounds.length > 0) {
    const winsMap = new Map<string, number>();
    stage.teams.forEach(t => winsMap.set(t.id, 0));
    stage.swissRounds.forEach(r => {
      r.forEach(m => {
        if (m.winnerId && winsMap.has(m.winnerId)) {
          winsMap.set(m.winnerId, (winsMap.get(m.winnerId) || 0) + 1);
        }
      });
    });
    const sorted = [...stage.teams].sort((a, b) => (winsMap.get(b.id) || 0) - (winsMap.get(a.id) || 0));
    sorted.slice(0, Math.ceil(stage.teams.length / 2)).forEach(t => winnersMap.set(t.id, t));
  }

  // 5. Qualifiers
  if (stage.qualifiersBrackets && stage.qualifiersBrackets.length > 0) {
    const advancePerQual = stage.advancePerQual || 1;
    stage.qualifiersBrackets.forEach(b => {
      if (b && b.length > 0) {
        const qualTeams = getBracketQualifiedTeams(b, advancePerQual);
        qualTeams.forEach(t => {
          if (t && t.id !== 'BYE') winnersMap.set(t.id, t);
        });
      }
    });
  }

  return Array.from(winnersMap.values());
}
