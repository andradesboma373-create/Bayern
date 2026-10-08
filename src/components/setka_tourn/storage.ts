import { Tournament, Team, Match } from "./types";
import {
  cascadeAdvancements,
  advanceDoubleElimMatch,
  generateDoubleElimination,
  generateSingleEliminationBracket,
  BYE_TEAM
} from "./doubleEliminationLogic";
import { updateGslMatch, advanceTieredPlayoffMatch, generateTieredPlayoffBracket, getGslGroupStandings } from "./gslLogic";
import { generateNextSwissRound } from "./swissLogic";
import { db, deleteDoc, doc, setDoc } from "../../firebase";
import { safeLocalStorageSet } from "../../lib/utils";
import { SO2_TEAMS } from "../../lib/so2Assets";

let memoryCache: Record<string, Tournament[]> = {};

/**
 * Enterprise-grade tournament normalizer:
 * Ensures all tournaments from previous versions, backups, or different rooms
 * are fully compatible with current bracket rendering, stage switching, and match mechanics.
 */
export const normalizeTournament = (t: any): Tournament => {
  if (!t || typeof t !== 'object') return t;
  const copy: any = { ...t };

  // 1. Ensure settings object exists
  if (!copy.settings || typeof copy.settings !== 'object') {
    copy.settings = { mode: 'single_stage', stage1Type: 'playoff' };
  } else {
    copy.settings = { ...copy.settings };
  }

  // PRE-NORMALIZATION: If bracketRounds is an object (Firestore format), try to fix it NOW 
  // before hasPlayoffStage check or any other logic runs.
  if (copy.bracketRounds && typeof copy.bracketRounds === 'object' && !Array.isArray(copy.bracketRounds)) {
    const fixed = ensureArrayOfRounds(copy.bracketRounds);
    if (fixed) copy.bracketRounds = fixed;
  }
  if (copy.losersBracketRounds && typeof copy.losersBracketRounds === 'object' && !Array.isArray(copy.losersBracketRounds)) {
    const fixed = ensureArrayOfRounds(copy.losersBracketRounds);
    if (fixed) copy.losersBracketRounds = fixed;
  }
  if (copy.tieredBracketRounds && typeof copy.tieredBracketRounds === 'object' && !Array.isArray(copy.tieredBracketRounds)) {
    const fixed = ensureArrayOfRounds(copy.tieredBracketRounds);
    if (fixed) copy.tieredBracketRounds = fixed;
  }
  if (copy.swissRounds && typeof copy.swissRounds === 'object' && !Array.isArray(copy.swissRounds)) {
    const fixed = ensureArrayOfRounds(copy.swissRounds);
    if (fixed) copy.swissRounds = fixed;
  }
  if (copy.grandFinal && typeof copy.grandFinal === 'object' && !Array.isArray(copy.grandFinal)) {
    const fixed = ensureArrayOfMatches(copy.grandFinal);
    if (fixed) copy.grandFinal = fixed;
  }
  if (copy.qualifiersBrackets && typeof copy.qualifiersBrackets === 'object' && !Array.isArray(copy.qualifiersBrackets)) {
    const fixed = ensureArrayOfQualifiers(copy.qualifiersBrackets);
    if (fixed) copy.qualifiersBrackets = fixed;
  }

  const hasGroupStage = (Array.isArray(copy.groups) && copy.groups.length > 0) || 
                        (Array.isArray(copy.gslGroups) && copy.gslGroups.length > 0) || 
                        (Array.isArray(copy.swissRounds) && copy.swissRounds.length > 0) ||
                        copy.settings.mode === 'two_stage' ||
                        copy.settings.stage1Type === 'groups' ||
                        copy.settings.stage1Type === 'gsl_groups' ||
                        copy.settings.stage1Type === 'swiss';

  const hasPlayoffStage = (Array.isArray(copy.bracketRounds) && copy.bracketRounds.length > 0) ||
                          (Array.isArray(copy.losersBracketRounds) && copy.losersBracketRounds.length > 0) ||
                          (Array.isArray(copy.tieredBracketRounds) && copy.tieredBracketRounds.length > 0) ||
                          copy.settings.stage1Type === 'playoff' ||
                          copy.settings.mode === 'single_stage' ||
                          copy.settings.mode === 'playoff';

  // 2. Auto-detect stage1Type if missing from old schema
  if (!copy.settings.stage1Type) {
    if (copy.swissRounds && copy.swissRounds.length > 0) {
      copy.settings.stage1Type = 'swiss';
      copy.settings.mode = 'swiss';
    } else if (copy.gslGroups && copy.gslGroups.length > 0) {
      copy.settings.stage1Type = 'gsl_groups';
      copy.settings.mode = 'two_stage';
    } else if (copy.groups && copy.groups.length > 0) {
      copy.settings.stage1Type = 'groups';
      copy.settings.mode = 'two_stage';
    } else if (copy.bracketRounds && copy.bracketRounds.length > 0) {
      copy.settings.stage1Type = 'playoff';
      copy.settings.mode = 'single_stage';
    } else if (copy.settings.mode === 'two_stage') {
      copy.settings.stage1Type = 'groups';
    } else if (copy.settings.mode === 'swiss') {
      copy.settings.stage1Type = 'swiss';
    } else {
      copy.settings.stage1Type = 'playoff';
      copy.settings.mode = 'single_stage';
    }
  }

  // 3. Normalize activeStage and eliminate invalid states
  const totalStages = Array.isArray(copy.settings?.stages) ? copy.settings.stages.length : (copy.settings?.numStages || 2);
  if (typeof copy.activeStage !== 'number' || copy.activeStage < 1 || copy.activeStage > Math.max(2, totalStages)) {
    if (hasPlayoffStage && !hasGroupStage) {
      copy.activeStage = 2;
    } else {
      copy.activeStage = 1;
    }
  } else if (!hasGroupStage && hasPlayoffStage && !copy.settings?.stages) {
    // Pure playoff tournament without multi-stage config
    copy.settings.stage1Type = 'playoff';
    copy.settings.mode = 'single_stage';
  }

  // 4. Game Universe identification ('cs2' | 'so2')
  if (!copy.game) {
    if (copy.settings?.game) {
      copy.game = copy.settings.game;
    } else if (
      (copy.name && /standoff|so2|со2|стандофф/i.test(copy.name)) ||
      (Array.isArray(copy.teams) && copy.teams.some((tm: any) => tm?.name && /saints|horizon|revival|necessary|bulls|forze so2|vp so2|streeteight/i.test(tm.name)))
    ) {
      copy.game = 'so2';
    } else {
      copy.game = 'cs2';
    }
  }
  if (!copy.settings.game) {
    copy.settings.game = copy.game;
  }

  // 5. Normalize team objects in matches across all stages
  const normalizeTeam = (tm: any, fallbackName = 'TBD'): any => {
    if (!tm) return null;
    if (typeof tm === 'string') {
      if (tm === 'BYE') return { id: 'BYE', name: 'BYE' };
      const found = Array.isArray(copy.teams) ? copy.teams.find((ct: any) => ct && (ct.id === tm || ct.name === tm)) : null;
      if (found) return found;
      return { id: tm, name: tm };
    }
    return {
      id: tm.id || tm.name || Math.random().toString(36).slice(2, 8),
      name: tm.name || tm.teamName || tm.title || fallbackName,
      logoUrl: tm.logoUrl || tm.logo || undefined
    };
  };

  const normalizeMatch = (m: any): any => {
    if (!m) return null;
    return {
      ...m,
      id: m.id || 'm_' + Math.random().toString(36).slice(2, 8),
      team1: normalizeTeam(m.team1, m.team1Name),
      team2: normalizeTeam(m.team2, m.team2Name),
      score1: typeof m.score1 === 'number' ? m.score1 : (parseInt(m.score1) || 0),
      score2: typeof m.score2 === 'number' ? m.score2 : (parseInt(m.score2) || 0),
      winnerId: m.winnerId || null
    };
  };

  if (Array.isArray(copy.bracketRounds)) {
    copy.bracketRounds = copy.bracketRounds.map((r: any) => Array.isArray(r) ? r.map(normalizeMatch).filter(Boolean) : []);
  }
  if (Array.isArray(copy.losersBracketRounds)) {
    copy.losersBracketRounds = copy.losersBracketRounds.map((r: any) => Array.isArray(r) ? r.map(normalizeMatch).filter(Boolean) : []);
  }
  if (Array.isArray(copy.grandFinal)) {
    copy.grandFinal = copy.grandFinal.map(normalizeMatch).filter(Boolean);
  }
  if (Array.isArray(copy.swissRounds)) {
    copy.swissRounds = copy.swissRounds.map((r: any) => Array.isArray(r) ? r.map(normalizeMatch).filter(Boolean) : []);
  }
  if (Array.isArray(copy.tieredBracketRounds)) {
    copy.tieredBracketRounds = copy.tieredBracketRounds.map((r: any) => Array.isArray(r) ? r.map(normalizeMatch).filter(Boolean) : []);
  }
  if (Array.isArray(copy.groups)) {
    copy.groups = copy.groups.map((g: any) => ({
      ...g,
      matches: Array.isArray(g.matches) ? g.matches.map(normalizeMatch).filter(Boolean) : []
    }));
  }
  if (Array.isArray(copy.qualifiersBrackets)) {
    copy.qualifiersBrackets = copy.qualifiersBrackets.map((bracket: any) => 
      Array.isArray(bracket) ? bracket.map((round: any) => Array.isArray(round) ? round.map(normalizeMatch).filter(Boolean) : []) : []
    );
  }

  // Normalize stages if present in settings
  if (copy.settings && Array.isArray(copy.settings.stages)) {
    copy.settings.stages = copy.settings.stages.map((stg: any, sIdx: number) => {
      const s = { ...stg };
      if (!s.id) s.id = `stage_${sIdx + 1}`;
      if (!s.name) s.name = `Стадия ${sIdx + 1}`;
      if (Array.isArray(s.teams)) {
        s.teams = s.teams.map((tm: any) => normalizeTeam(tm)).filter(Boolean);
      } else {
        s.teams = [];
      }
      if (Array.isArray(s.bracketRounds)) {
        s.bracketRounds = s.bracketRounds.map((r: any) => Array.isArray(r) ? r.map(normalizeMatch).filter(Boolean) : []);
      }
      if (Array.isArray(s.losersBracketRounds)) {
        s.losersBracketRounds = s.losersBracketRounds.map((r: any) => Array.isArray(r) ? r.map(normalizeMatch).filter(Boolean) : []);
      }
      if (Array.isArray(s.swissRounds)) {
        s.swissRounds = s.swissRounds.map((r: any) => Array.isArray(r) ? r.map(normalizeMatch).filter(Boolean) : []);
      }
      if (Array.isArray(s.groups)) {
        s.groups = s.groups.map((g: any) => ({
          ...g,
          matches: Array.isArray(g.matches) ? g.matches.map(normalizeMatch).filter(Boolean) : []
        }));
      }
      return s;
    });
  }

  // 5. Auto-repair missing playoff bracket if it was lost in transmission or stripped in lightweight storage
  const isPlayoffMode = copy.settings.stage1Type === 'playoff' || copy.settings.mode === 'single_stage';
  if (isPlayoffMode && (!copy.bracketRounds || copy.bracketRounds.length === 0) && Array.isArray(copy.teams) && copy.teams.length >= 2) {
    // CRITICAL: Double check that bracketRounds is REALLY missing and not just in a format we missed
    if (!copy.bracketRounds_json || copy.bracketRounds_json === '[]') {
        console.warn(`[Tournament Normalizer] Auto-repairing playoff bracket for ${copy.id}. This might reset progress if data was partially lost.`);
        if (copy.settings.eliminationType === 'double') {
          const res = generateDoubleElimination(copy.teams);
          copy.bracketRounds = res.winnersBracket;
          copy.losersBracketRounds = res.losersBracket;
          copy.grandFinal = res.grandFinal;
        } else {
          copy.bracketRounds = generateSingleEliminationBracket(copy.teams);
        }
    }
  }

  return copy as Tournament;
};

/**
 * Converts nested rounds from arrays, JSON strings, or Firestore objects into typed Match[][]
 */
export function ensureArrayOfRounds(val: any, jsonVal?: string): Match[][] | undefined {
  if (Array.isArray(val) && val.length > 0) {
    // Check if it's an array of arrays. If it's an array of objects but those objects look like Firestore rounds...
    if (val.every(item => item && typeof item === 'object' && !Array.isArray(item) && (item._isNestedArray || Object.keys(item).some(k => k.startsWith('item_') || k.startsWith('round_'))))) {
       return val.map(item => ensureArrayOfMatches(item)).filter(Boolean) as Match[][];
    }
    return val;
  }
  if (jsonVal && typeof jsonVal === 'string' && jsonVal.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(jsonVal);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  if (val && typeof val === 'object' && val !== null) {
    const keys = Object.keys(val);
    if (keys.length > 0) {
      const sortedKeys = keys
        .filter(k => k !== '_isNestedArray')
        .sort((a, b) => {
          const na = parseInt(a.replace(/\D/g, ''));
          const nb = parseInt(b.replace(/\D/g, ''));
          if (!isNaN(na) && !isNaN(nb)) return na - nb;
          return a.localeCompare(b);
        });
      
      const arr = sortedKeys.map(k => {
          const item = val[k];
          if (item && typeof item === 'object' && !Array.isArray(item)) {
              return ensureArrayOfMatches(item);
          }
          return item;
      }).filter(Array.isArray);
      
      if (arr.length > 0) return arr;
    }
  }
  return Array.isArray(val) ? val : undefined;
}

export function ensureArrayOfMatches(val: any, jsonVal?: string): Match[] | undefined {
  if (Array.isArray(val) && val.length > 0) return val;
  if (jsonVal && typeof jsonVal === 'string' && jsonVal.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(jsonVal);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  if (val && typeof val === 'object' && val !== null) {
    const keys = Object.keys(val)
      .filter(k => k !== '_isNestedArray')
      .sort((a, b) => (parseInt(a.replace(/\D/g, '')) || 0) - (parseInt(b.replace(/\D/g, '')) || 0));
    const arr = keys.map(k => val[k]).filter(m => m && typeof m === 'object');
    if (arr.length > 0) return arr;
  }
  return Array.isArray(val) ? val : undefined;
}

export function ensureArrayOfQualifiers(val: any, jsonVal?: string): Match[][][] | undefined {
  if (jsonVal && typeof jsonVal === 'string' && jsonVal.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(jsonVal);
      if (Array.isArray(parsed)) {
        return parsed.map((b: any) => ensureArrayOfRounds(b) || []).filter(Array.isArray);
      }
    } catch (e) {}
  }
  if (Array.isArray(val)) {
    return val.map((b: any) => ensureArrayOfRounds(b) || []).filter(Array.isArray);
  }
  if (val && typeof val === 'object' && val !== null) {
    const keys = Object.keys(val);
    if (keys.length > 0) {
      const sortedKeys = keys
        .filter(k => k !== '_isNestedArray')
        .sort((a, b) => {
          const na = parseInt(a.replace(/\D/g, ''));
          const nb = parseInt(b.replace(/\D/g, ''));
          if (!isNaN(na) && !isNaN(nb)) return na - nb;
          return a.localeCompare(b);
        });
      const arr = sortedKeys.map(k => ensureArrayOfRounds(val[k]) || []);
      if (arr.length > 0) return arr;
    }
  }
  return undefined;
}

/**
 * Safely serializes tournament for Google Cloud Firestore (avoids nested arrays error)
 */
export const serializeTournamentForFirestore = (tournament: Tournament): any => {
  if (!tournament) return tournament;
  const docData: any = { ...tournament };
  if (Array.isArray(docData.bracketRounds)) {
    docData.bracketRounds_json = JSON.stringify(docData.bracketRounds);
    delete docData.bracketRounds;
  }
  if (Array.isArray(docData.losersBracketRounds)) {
    docData.losersBracketRounds_json = JSON.stringify(docData.losersBracketRounds);
    delete docData.losersBracketRounds;
  }
  if (Array.isArray(docData.swissRounds)) {
    docData.swissRounds_json = JSON.stringify(docData.swissRounds);
    delete docData.swissRounds;
  }
  if (Array.isArray(docData.tieredBracketRounds)) {
    docData.tieredBracketRounds_json = JSON.stringify(docData.tieredBracketRounds);
    delete docData.tieredBracketRounds;
  }
  if (Array.isArray(docData.gslGroups)) {
    docData.gslGroups_json = JSON.stringify(docData.gslGroups);
    delete docData.gslGroups;
  }
  if (Array.isArray(docData.qualifiersBrackets)) {
    docData.qualifiersBrackets_json = JSON.stringify(docData.qualifiersBrackets);
    delete docData.qualifiersBrackets;
  }

  // Safely serialize stages inside settings
  if (docData.settings && Array.isArray(docData.settings.stages)) {
    docData.settings = {
      ...docData.settings,
      stages: docData.settings.stages.map((stg: any) => {
        const s = { ...stg };
        if (Array.isArray(s.bracketRounds)) {
          s.bracketRounds_json = JSON.stringify(s.bracketRounds);
          delete s.bracketRounds;
        }
        if (Array.isArray(s.losersBracketRounds)) {
          s.losersBracketRounds_json = JSON.stringify(s.losersBracketRounds);
          delete s.losersBracketRounds;
        }
        if (Array.isArray(s.swissRounds)) {
          s.swissRounds_json = JSON.stringify(s.swissRounds);
          delete s.swissRounds;
        }
        if (Array.isArray(s.gslGroups)) {
          s.gslGroups_json = JSON.stringify(s.gslGroups);
          delete s.gslGroups;
        }
        if (Array.isArray(s.qualifiersBrackets)) {
          s.qualifiersBrackets_json = JSON.stringify(s.qualifiersBrackets);
          delete s.qualifiersBrackets;
        }
        return s;
      })
    };
  }

  return docData;
};

/**
 * Safely deserializes tournament from Google Cloud Firestore
 */
export const deserializeTournamentFromFirestore = (data: any): Tournament => {
  if (!data) return data;
  const t: any = { ...data };
  
  const bracket = ensureArrayOfRounds(t.bracketRounds, t.bracketRounds_json);
  if (bracket) t.bracketRounds = bracket;

  const losers = ensureArrayOfRounds(t.losersBracketRounds, t.losersBracketRounds_json);
  if (losers) t.losersBracketRounds = losers;

  const swiss = ensureArrayOfRounds(t.swissRounds, t.swissRounds_json);
  if (swiss) t.swissRounds = swiss;

  const tiered = ensureArrayOfRounds(t.tieredBracketRounds, t.tieredBracketRounds_json);
  if (tiered) t.tieredBracketRounds = tiered;

  const quals = ensureArrayOfQualifiers(t.qualifiersBrackets, t.qualifiersBrackets_json);
  if (quals) t.qualifiersBrackets = quals;

  const gf = ensureArrayOfMatches(t.grandFinal, t.grandFinal_json);
  if (gf) t.grandFinal = gf;

  if (t.gslGroups_json && (!t.gslGroups || !Array.isArray(t.gslGroups))) {
    try { t.gslGroups = JSON.parse(t.gslGroups_json); } catch (e) {}
  }

  if (t.settings && Array.isArray(t.settings.stages)) {
    t.settings.stages = t.settings.stages.map((stg: any) => {
      const s = { ...stg };
      const sBracket = ensureArrayOfRounds(s.bracketRounds, s.bracketRounds_json);
      if (sBracket) s.bracketRounds = sBracket;

      const sLosers = ensureArrayOfRounds(s.losersBracketRounds, s.losersBracketRounds_json);
      if (sLosers) s.losersBracketRounds = sLosers;

      const sSwiss = ensureArrayOfRounds(s.swissRounds, s.swissRounds_json);
      if (sSwiss) s.swissRounds = sSwiss;

      if (s.gslGroups_json && (!s.gslGroups || !Array.isArray(s.gslGroups))) {
        try { s.gslGroups = JSON.parse(s.gslGroups_json); } catch (e) {}
      }
      const sQuals = ensureArrayOfQualifiers(s.qualifiersBrackets, s.qualifiersBrackets_json);
      if (sQuals) s.qualifiersBrackets = sQuals;
      return s;
    });
  }

  return normalizeTournament(t);
};

// Helper: resolve canonical room ID for data isolation and sharing across devices and accounts in the same room
export const getCanonicalRoomId = (userId?: string, discipline?: string): string => {
  let roomId = 'guest';
  if (userId) {
    let clean = String(userId).trim();
    if (clean.includes('@')) {
      clean = clean.split('@')[0];
    }
    if (clean.startsWith('channel_')) {
      roomId = clean;
    } else {
      // Map known default accounts to room
      if (clean === 'bamep' || clean === 'zeixst') {
        roomId = 'channel_bamep_cs2';
      } else if (clean === 'simu') {
        roomId = 'channel_simu';
      } else if (clean === 'airy') {
        roomId = 'channel_airy';
      } else {
        roomId = clean;
      }
    }
  } else {
    try {
      const raw = localStorage.getItem('customUser');
      if (raw) {
        const u = JSON.parse(raw);
        if (u && (u.channelId || u.uid)) {
          let ch = String(u.channelId || u.uid);
          if (ch.includes('@')) ch = ch.split('@')[0];
          if (ch.startsWith('channel_')) {
            roomId = ch;
          } else if (ch === 'bamep' || ch === 'zeixst') {
            roomId = 'channel_bamep_cs2';
          } else if (ch === 'simu') {
            roomId = 'channel_simu';
          } else if (ch === 'airy') {
            roomId = 'channel_airy';
          } else {
            roomId = ch;
          }
        }
      }
    } catch (e) {}
  }

  // Handle discipline separation if requested
  if (discipline === 'so2') {
    if (roomId === 'channel_bamep_cs2') return 'channel_bamep_so2';
    if (!roomId.endsWith('_so2')) return `${roomId}_so2`;
  } else if (discipline === 'cs2') {
    if (roomId === 'channel_bamep_so2') return 'channel_bamep_cs2';
    // By convention most rooms are cs2, but we can be explicit if needed
  }

  return roomId;
};

// Helper: load background image specifically saved for a tournament
export const getTournamentBgImage = (tournamentId: string): string | null => {
  try {
    const bg = localStorage.getItem(`tournament_bg_${tournamentId}`);
    return (bg && bg !== 'null' && bg !== 'undefined' && bg.trim() !== '') ? bg : null;
  } catch (e) {
    return null;
  }
};

// Helper: manage deleted tournament IDs to prevent server sync resurrecting deleted tournaments
export const getDeletedTournamentIds = (userId: string): Set<string> => {
  try {
    const roomId = getCanonicalRoomId(userId);
    const raw = localStorage.getItem(`deleted_tournaments_${roomId}`) || localStorage.getItem(`deleted_tournaments_${userId}`);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
};

export const addDeletedTournamentId = (userId: string, id: string) => {
  try {
    const roomId = getCanonicalRoomId(userId);
    const set = getDeletedTournamentIds(roomId);
    set.add(id);
    const json = JSON.stringify(Array.from(set));
    localStorage.setItem(`deleted_tournaments_${roomId}`, json);
    if (userId !== roomId) {
      localStorage.setItem(`deleted_tournaments_${userId}`, json);
    }
  } catch (e) {}
};

export const removeDeletedTournamentId = (userId: string, id: string) => {
  try {
    const roomId = getCanonicalRoomId(userId);
    const set = getDeletedTournamentIds(roomId);
    set.delete(id);
    const json = JSON.stringify(Array.from(set));
    localStorage.setItem(`deleted_tournaments_${roomId}`, json);
    if (userId !== roomId) {
      localStorage.setItem(`deleted_tournaments_${userId}`, json);
    }
  } catch (e) {}
};

// Helper: save background image specifically for a tournament
export const setTournamentBgImage = (tournamentId: string, bgUrl: string | null) => {
  try {
    if (bgUrl && bgUrl !== 'null' && bgUrl !== 'undefined' && bgUrl.trim() !== '') {
      localStorage.setItem(`tournament_bg_${tournamentId}`, bgUrl);
    } else {
      localStorage.removeItem(`tournament_bg_${tournamentId}`);
    }
  } catch (e) {
    console.warn("Could not save background image for tournament " + tournamentId, e);
  }
};

// Helper: load photo/logo specifically saved for a tournament
export const getTournamentLogoUrl = (tournamentId: string): string | null => {
  try {
    const logo = localStorage.getItem(`tournament_logo_${tournamentId}`);
    return (logo && logo !== 'null' && logo !== 'undefined' && logo.trim() !== '') ? logo : null;
  } catch (e) {
    return null;
  }
};

// Helper: save photo/logo specifically for a tournament to prevent loss
export const setTournamentLogoUrl = (tournamentId: string, logoUrl: string | null | undefined) => {
  try {
    if (logoUrl && logoUrl !== 'null' && logoUrl !== 'undefined' && logoUrl.trim() !== '') {
      localStorage.setItem(`tournament_logo_${tournamentId}`, logoUrl);
    } else if (logoUrl === null || logoUrl === '') {
      localStorage.removeItem(`tournament_logo_${tournamentId}`);
    }
  } catch (e) {
    console.warn("Could not save logo for tournament " + tournamentId, e);
  }
};

export const loadTournaments = (userId: string, forceReload: boolean = false): Tournament[] => {
  const roomId = getCanonicalRoomId(userId);

  if (!forceReload && memoryCache[roomId] && memoryCache[roomId].length > 0) {
    return memoryCache[roomId];
  }
  if (!forceReload && memoryCache[userId] && memoryCache[userId].length > 0) {
    return memoryCache[userId];
  }

  try {
    const deletedIds = getDeletedTournamentIds(roomId);
    const mergedMap = new Map<string, Tournament>();

    const checkKeys = [
      "tournaments_" + roomId,
      ...(userId !== roomId ? ["tournaments_" + userId] : []),
      // Also check standard aliases and historical storage keys
      "tournaments_channel_bamep_cs2",
      "tournaments_bamep",
      "tournaments_zeixst",
      "tournaments_channel_simu",
      "tournaments_simu",
      "tournaments_channel_airy",
      "tournaments_airy",
      "tournaments_data_beta",
      "tournaments_data",
      "tournaments_default"
    ];

    // 1. Load from monolithic lists
    for (const key of checkKeys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const list: any[] = JSON.parse(raw);
          if (Array.isArray(list)) {
            for (const item of list) {
              if (item && item.id && !deletedIds.has(item.id)) {
                if (!mergedMap.has(item.id)) {
                  mergedMap.set(item.id, normalizeTournament({ ...item, channelId: roomId }));
                }
              }
            }
          }
        } catch (e) {}
      }
    }

    // 2. Scan all individual tournament item keys
    const prefixes = [
      `tournament_item_${roomId}_`,
      ...(userId !== roomId ? [`tournament_item_${userId}_`] : []),
      `tournament_item_channel_bamep_cs2_`,
      `tournament_item_bamep_`,
      `tournament_item_zeixst_`,
      `tournament_item_channel_simu_`,
      `tournament_item_simu_`,
      `tournament_item_channel_airy_`,
      `tournament_item_airy_`,
      `tournament_item_`,
      `tournament_`
    ];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && prefixes.some(p => k.startsWith(p)) && !k.startsWith('tournament_bg_')) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              const item = JSON.parse(raw);
              if (item && item.id && !deletedIds.has(item.id)) {
                const existing = mergedMap.get(item.id);
                let combined = item;
                if (existing) {
                  combined = {
                    ...existing,
                    ...item,
                    bracketRounds: item.bracketRounds || existing.bracketRounds,
                    losersBracketRounds: item.losersBracketRounds || existing.losersBracketRounds,
                    grandFinal: item.grandFinal || existing.grandFinal,
                    swissRounds: item.swissRounds || existing.swissRounds,
                    tieredBracketRounds: item.tieredBracketRounds || existing.tieredBracketRounds,
                    groups: item.groups || existing.groups,
                    gslGroups: item.gslGroups || existing.gslGroups,
                    channelId: roomId
                  };
                }
                mergedMap.set(item.id, normalizeTournament(combined));
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {}

    // 3. Attach background images and logos for each tournament if stored separately
    const tournaments: Tournament[] = [];
    for (const [id, t] of mergedMap.entries()) {
      if (deletedIds.has(id)) continue;
      const copy = { ...t };
      const isolatedBg = getTournamentBgImage(id);
      if (isolatedBg) {
        copy.settings = { ...copy.settings, bgImage: isolatedBg };
      }
      const isolatedLogo = getTournamentLogoUrl(id);
      if (isolatedLogo && (!copy.logoUrl || copy.logoUrl.trim() === '')) {
        copy.logoUrl = isolatedLogo;
      }
      tournaments.push(normalizeTournament(copy));
    }

    memoryCache[roomId] = tournaments;
    if (userId !== roomId) {
      memoryCache[userId] = tournaments;
    }
    return tournaments;
  } catch (e) {
    console.error("Error loading tournaments:", e);
    return [];
  }
};

// Helper: sync tournaments with remote server/database for multi-device sync
export const syncTournamentsWithServer = async (userId: string): Promise<Tournament[]> => {
  const roomId = getCanonicalRoomId(userId);
  if (!roomId || roomId === 'guest') return loadTournaments(userId);

  try {
    const res = await fetch(`/api/backup-data/${roomId}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.tournaments)) {
        const serverTourneys: Tournament[] = data.tournaments.map(deserializeTournamentFromFirestore);
        const local = loadTournaments(roomId, true);
        const deletedIds = getDeletedTournamentIds(roomId);

        const mergedMap = new Map<string, Tournament>();
        // Server items first
        for (const t of serverTourneys) {
          if (t && t.id && !deletedIds.has(t.id)) {
            mergedMap.set(t.id, normalizeTournament({ ...t, channelId: roomId }));
          }
        }
        // Local items second
        for (const t of local) {
          if (t && t.id && !deletedIds.has(t.id)) {
            const serverT = mergedMap.get(t.id);
            const combined = serverT ? {
              ...serverT,
              ...t,
              bracketRounds: t.bracketRounds || serverT.bracketRounds,
              losersBracketRounds: t.losersBracketRounds || serverT.losersBracketRounds,
              grandFinal: t.grandFinal || serverT.grandFinal,
              swissRounds: t.swissRounds || serverT.swissRounds,
              tieredBracketRounds: t.tieredBracketRounds || serverT.tieredBracketRounds,
              groups: t.groups || serverT.groups,
              gslGroups: t.gslGroups || serverT.gslGroups,
              channelId: roomId
            } : t;
            mergedMap.set(t.id, normalizeTournament(combined));
          }
        }

        const merged = Array.from(mergedMap.values());
        saveTournaments(roomId, merged);
        if (userId && userId !== roomId) {
          saveTournaments(userId, merged);
        }
        memoryCache[roomId] = merged;
        memoryCache[userId] = merged;
        window.dispatchEvent(new Event("tournaments-updated"));
        return merged;
      }
    }
  } catch (err) {
    console.warn("Could not sync tournaments from backend:", err);
  }
  return loadTournaments(roomId);
};

// Helper: compact tournament object to avoid blowing localStorage 5MB quota
export const compactTournamentForStorage = (tournament: Tournament): Tournament => {
  if (!tournament) return tournament;
  try {
    const copy: Tournament = JSON.parse(JSON.stringify(tournament));
    
    // Extract background image if present and large
    if (copy.settings?.bgImage) {
      if (copy.settings.bgImage.startsWith('data:image')) {
        setTournamentBgImage(copy.id, copy.settings.bgImage);
        copy.settings.bgImage = undefined;
      }
    }

    // Strip duplicate base64 logos from match cards across all tournament stages
    const stripLogosFromMatches = (matches: any[]) => {
      if (!Array.isArray(matches)) return;
      for (const m of matches) {
        if (!m) continue;
        if (m.team1 && m.team1.logoUrl && m.team1.logoUrl.startsWith('data:image')) {
          m.team1.logoUrl = undefined;
        }
        if (m.team2 && m.team2.logoUrl && m.team2.logoUrl.startsWith('data:image')) {
          m.team2.logoUrl = undefined;
        }
      }
    };

    if (copy.bracketRounds) copy.bracketRounds.forEach(stripLogosFromMatches);
    if (copy.losersBracketRounds) copy.losersBracketRounds.forEach(stripLogosFromMatches);
    if (copy.swissRounds) copy.swissRounds.forEach(stripLogosFromMatches);
    if (copy.tieredBracketRounds) copy.tieredBracketRounds.forEach(stripLogosFromMatches);
    if (copy.grandFinal) stripLogosFromMatches(copy.grandFinal);
    if (copy.groups) copy.groups.forEach(g => stripLogosFromMatches(g.matches));
    if (copy.gslGroups) {
      copy.gslGroups.forEach(g => {
        if (g.upperBracket) g.upperBracket.forEach(stripLogosFromMatches);
        if (g.lowerBracket) g.lowerBracket.forEach(stripLogosFromMatches);
      });
    }

    // Strip excessively large base64 logos in teams list (> 150KB)
    if (Array.isArray(copy.teams)) {
      for (const t of copy.teams) {
        if (t && t.logoUrl && t.logoUrl.startsWith('data:image') && t.logoUrl.length > 150000) {
          t.logoUrl = undefined;
        }
      }
    }

    return copy;
  } catch (err) {
    return tournament;
  }
};

// Helper: perform emergency cleanup of legacy redundant caches to free up localStorage quota
export const cleanupTournamentStorageQuota = (userId?: string) => {
  try {
    const keysToRemove: string[] = [];
    const roomId = getCanonicalRoomId(userId);

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;

      // 1. Remove ANY duplicate keys containing email addresses (@matchsimulator.com or @)
      if (k.includes('@matchsimulator.com') || (k.includes('@') && k.startsWith('tournament_'))) {
        keysToRemove.push(k);
        continue;
      }

      // 2. Remove temporary heavy logo & avatar caches stored in localStorage
      if (k.startsWith('player_avatar_') || k.startsWith('team_logo_')) {
        keysToRemove.push(k);
        continue;
      }

      // 3. Remove monolithic duplicate tournaments lists if isolated items exist
      if (k === `tournaments_${roomId}` || (userId && k === `tournaments_${userId}`)) {
        keysToRemove.push(k);
        continue;
      }
    }

    keysToRemove.forEach(k => {
      try { localStorage.removeItem(k); } catch (e) {}
    });
  } catch (e) {}
};

// Helper to save a single tournament to its own local storage key
const saveSingleTournamentIsolated = (userId: string, tournament: Tournament) => {
  if (!tournament || !tournament.id) return;
  const roomId = getCanonicalRoomId(userId);
  const singleKey = `tournament_item_${roomId}_${tournament.id}`;
  
  const compacted = compactTournamentForStorage(tournament);
  compacted.channelId = roomId;

  let jsonStr = JSON.stringify(compacted);

  // If jsonStr is still over 1MB, strip any big base64 images
  if (jsonStr.length > 1000000) {
    jsonStr = jsonStr.replace(/"data:image\/[^;]+;base64,[^"]{10000,}"/g, 'null');
  }

  try {
    localStorage.setItem(singleKey, jsonStr);
  } catch (e) {
    console.warn("Storage quota warning on saving tournament " + tournament.id + ", performing cleanup...", e);
    cleanupTournamentStorageQuota(roomId);
    try {
      // Retry after cleanup
      localStorage.setItem(singleKey, jsonStr);
    } catch (e2) {
      // Fallback: strip any base64 image strings completely
      try {
        const stripped = jsonStr.replace(/"data:image\/[^;]+;base64,[^"]+"/g, 'null');
        localStorage.setItem(singleKey, stripped);
      } catch (e3) {
        console.warn("Notice: Local storage quota full for tournament item, state safely preserved in memory and server:", e3);
      }
    }
  }
};

// Helper to save lightweight index of all tournaments for user
const saveTournamentsIndex = (userId: string, tournaments: Tournament[]) => {
  const roomId = getCanonicalRoomId(userId);
  try {
    const indexKey = "tournaments_index_" + roomId;
    const indexList = tournaments.map(t => ({
      id: t.id,
      name: t.name,
      activeStage: t.activeStage,
      completed: t.completed,
      winnerName: t.winnerName,
      logoUrl: t.logoUrl,
      prizePool: t.prizePool
    }));
    localStorage.setItem(indexKey, JSON.stringify(indexList));

    // Keep lightweight list in legacy key to avoid blowing quota
    const legacyKey = "tournaments_" + roomId;
    try {
      const lightweightTourneys = tournaments.map(t => {
        const { bracketRounds, losersBracketRounds, swissRounds, groups, tieredBracketRounds, ...lightweight } = t;
        return lightweight;
      });
      localStorage.setItem(legacyKey, JSON.stringify(lightweightTourneys));
    } catch (legErr) {
      try {
        localStorage.removeItem(legacyKey);
      } catch (e) {}
    }
  } catch (e) {
    cleanupTournamentStorageQuota(roomId);
    try {
      const indexKey = "tournaments_index_" + roomId;
      const indexList = tournaments.map(t => ({ id: t.id, name: t.name }));
      localStorage.setItem(indexKey, JSON.stringify(indexList));
    } catch (e2) {}
  }
};

export const saveTournament = (userId: string, tournament: Tournament) => {
  const roomId = getCanonicalRoomId(userId);
  if (tournament.id) {
    removeDeletedTournamentId(roomId, tournament.id);
  }
  if (tournament.logoUrl) {
    setTournamentLogoUrl(tournament.id, tournament.logoUrl);
  }
  if (tournament.settings?.bgImage) {
    setTournamentBgImage(tournament.id, tournament.settings.bgImage);
  }
  const all = loadTournaments(roomId);
  const index = all.findIndex((t) => t.id === tournament.id);
  const tourneyToSave = { ...tournament, channelId: roomId, userId: roomId };
  
  if (index >= 0) {
    all[index] = tourneyToSave;
  } else {
    all.push(tourneyToSave);
  }

  memoryCache[roomId] = [...all];
  if (userId && userId !== roomId) {
    memoryCache[userId] = [...all];
  }

  // 1. Save ONLY this single tournament into its isolated key for roomId
  saveSingleTournamentIsolated(roomId, tourneyToSave);

  // 2. Save updated tournaments index for roomId
  saveTournamentsIndex(roomId, all);

  // 3. Ensure all teams from this tournament are preserved in the room's global teams pool
  if (Array.isArray(tournament.teams) && tournament.teams.length > 0 && roomId !== 'guest') {
    try {
      const storedRaw = localStorage.getItem(`teams_${roomId}`) || localStorage.getItem(`teams_${userId}`);
      let currentRoomTeams: any[] = [];
      try { currentRoomTeams = storedRaw ? JSON.parse(storedRaw) : []; } catch (e) {}

      let addedAny = false;
      const existingNames = new Set(currentRoomTeams.map((ct: any) => (ct && ct.name ? ct.name.trim().toLowerCase() : '')));
      for (const tItem of tournament.teams) {
        if (tItem && tItem.name && !existingNames.has(tItem.name.trim().toLowerCase())) {
          currentRoomTeams.push({
            id: 't_' + (tItem.id || Math.random().toString(36).slice(2, 8)),
            name: tItem.name.trim(),
            channelId: roomId,
            userId: roomId,
            logoUrl: tItem.logoUrl || '',
            isAcademy: false,
            players: [],
            balance: 0,
            leader: '',
            createdAt: new Date().toISOString()
          });
          existingNames.add(tItem.name.trim().toLowerCase());
          addedAny = true;
        }
      }
      if (addedAny) {
        safeLocalStorageSet(`teams_${roomId}`, currentRoomTeams);
        if (roomId !== userId) safeLocalStorageSet(`teams_${userId}`, currentRoomTeams);
        window.dispatchEvent(new Event("db-user-updated"));
        fetch('/api/sync-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: roomId, teams: currentRoomTeams })
        }).catch(() => {});
      }
    } catch (e) {}
  }

  window.dispatchEvent(new Event("tournaments-updated"));

  // Sync to database and server silently if not a guest
  if (tournament.id && roomId !== 'guest') {
    import('../../firebase').then(({ db, doc, setDoc }) => {
      setDoc(doc(db, "tournaments", tournament.id), serializeTournamentForFirestore(tourneyToSave)).catch(e => console.error("Database sync error", e));
    }).catch(console.error);

    fetch('/api/sync-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: roomId,
        tournaments: [compactTournamentForStorage(tourneyToSave)]
      })
    }).catch(() => {});
  }
};

export const deleteTournament = (userId: string, tournamentId: string) => {
  const roomId = getCanonicalRoomId(userId);
  console.log(`[Tournament Storage] Deleting tournament ${tournamentId} from room ${roomId}`);
  addDeletedTournamentId(roomId, tournamentId);

  const all = loadTournaments(roomId);
  console.log(`[Tournament Storage] Current tournament count: ${all.length}`);
  const filtered = all.filter((t) => t.id !== tournamentId);
  console.log(`[Tournament Storage] Tournament count after filter: ${filtered.length}`);
  memoryCache[roomId] = [...filtered];
  if (userId && userId !== roomId) {
    memoryCache[userId] = [...filtered];
  }

  try {
    // Remove individual tournament files
    console.log(`[Tournament Storage] Removing local storage items for ${tournamentId}`);
    localStorage.removeItem(`tournament_item_${roomId}_${tournamentId}`);
    localStorage.removeItem(`tournament_bg_${tournamentId}`);
    if (userId && userId !== roomId) {
      localStorage.removeItem(`tournament_item_${userId}_${tournamentId}`);
    }
  } catch (e) {
    console.error(`[Tournament Storage] Error removing local storage items:`, e);
  }

  saveTournamentsIndex(roomId, filtered);
  window.dispatchEvent(new Event("tournaments-updated"));

  if (roomId !== 'guest') {
    import('../../firebase').then(({ db, doc, deleteDoc }) => {
      deleteDoc(doc(db, "tournaments", tournamentId)).then(() => {
        console.log(`[Tournament Storage] Successfully deleted from Firestore: ${tournamentId}`);
      }).catch(e => console.error("Firebase delete error", e));
    }).catch(console.error);

    fetch('/api/sync-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: roomId, tournaments: filtered })
    }).then(() => console.log(`[Tournament Storage] Successfully synced delete to server`)).catch((e) => console.error(`[Tournament Storage] Sync error:`, e));
  }
};

export const clearRoomTournaments = (userId: string) => {
  const roomId = getCanonicalRoomId(userId);
  
  // Mark all current tournaments as deleted so they don't reappear
  try {
    const current = memoryCache[roomId] || [];
    current.forEach(t => {
      if (t && t.id) addDeletedTournamentId(roomId, t.id);
    });
  } catch (e) {}

  memoryCache[roomId] = [];
  if (userId && userId !== roomId) {
    memoryCache[userId] = [];
  }

  try {
    localStorage.removeItem(`tournaments_${roomId}`);
    localStorage.removeItem(`tournaments_metadata_${roomId}`);
    localStorage.removeItem(`tournaments_backup_${roomId}`);
    if (userId && userId !== roomId) {
      localStorage.removeItem(`tournaments_${userId}`);
      localStorage.removeItem(`tournaments_metadata_${userId}`);
      localStorage.removeItem(`tournaments_backup_${userId}`);
    }
  } catch (e) {}

  saveTournamentsIndex(roomId, []);
  window.dispatchEvent(new Event("tournaments-updated"));
};

export const saveTournaments = (userId: string, tournaments: Tournament[]) => {
  const roomId = getCanonicalRoomId(userId);
  memoryCache[roomId] = [...tournaments];
  if (userId && userId !== roomId) {
    memoryCache[userId] = [...tournaments];
  }
  for (const t of tournaments) {
    if (t.settings?.bgImage) {
      setTournamentBgImage(t.id, t.settings.bgImage);
    }
    if (t.logoUrl) {
      setTournamentLogoUrl(t.id, t.logoUrl);
    }
    saveSingleTournamentIsolated(roomId, t);
  }
  saveTournamentsIndex(roomId, tournaments);
  window.dispatchEvent(new Event("tournaments-updated"));
};

export const updateBetaTournamentMatchResult = (
  userId: string,
  tournamentId: string,
  team1Name: string,
  team2Name: string,
  team1Score: number,
  team2Score: number,
) => {
  try {
    const all = loadTournaments(userId);
    const tourney = all.find((t) => t.id === tournamentId);
    if (!tourney) return;

    const normalize = (s: string) => (s || "").trim().toLowerCase();
    const name1 = normalize(team1Name);
    const name2 = normalize(team2Name);

    let updated = false;

    if (tourney.bracketRounds) {
      const isDouble = tourney.settings?.eliminationType === "double";
      let wBracket = tourney.bracketRounds
        ? JSON.parse(JSON.stringify(tourney.bracketRounds))
        : [];
      let lBracket = tourney.losersBracketRounds
        ? JSON.parse(JSON.stringify(tourney.losersBracketRounds))
        : [];
      let gFinal = tourney.grandFinal
        ? JSON.parse(JSON.stringify(tourney.grandFinal))
        : [];

      const searchAndApply = (bracket: any[], type: "w" | "l" | "gf") => {
        for (let rIdx = 0; rIdx < bracket.length; rIdx++) {
          const actualMatches = type === "gf" ? [bracket[rIdx]] : bracket[rIdx];
          for (let mIdx = 0; mIdx < actualMatches.length; mIdx++) {
            const m = actualMatches[mIdx];
            if (!m || !m.team1 || !m.team2) continue;

            const m1 = normalize(m.team1.name || "");
            const m2 = normalize(m.team2.name || "");

            let matchFound = false;
            let s1 = 0,
              s2 = 0;

            if (m1 === name1 && m2 === name2) {
              matchFound = true;
              s1 = team1Score;
              s2 = team2Score;
            } else if (m1 === name2 && m2 === name1) {
              matchFound = true;
              s1 = team2Score;
              s2 = team1Score;
            }

            if (matchFound) {
              m.score1 = s1;
              m.score2 = s2;
              const winnerTeam = s1 > s2 ? m.team1 : s2 > s1 ? m.team2 : null;
              const loserTeam = s1 > s2 ? m.team2 : s2 > s1 ? m.team1 : null;
              m.winnerId = winnerTeam ? winnerTeam.id : null;
              updated = true;

              if (winnerTeam && loserTeam) {
                if (isDouble) {
                  advanceDoubleElimMatch(
                    wBracket,
                    lBracket,
                    gFinal,
                    type,
                    rIdx,
                    type === "gf" ? 0 : mIdx,
                    winnerTeam,
                    loserTeam,
                  );
                  const cascaded = cascadeAdvancements(
                    wBracket,
                    lBracket,
                    gFinal,
                  );
                  tourney.bracketRounds = cascaded.winnersBracket;
                  tourney.losersBracketRounds = cascaded.losersBracket;
                  tourney.grandFinal = cascaded.grandFinal;
                } else {
                  if (type === "w" && rIdx < bracket.length - 1) {
                    const nextRoundIdx = rIdx + 1;
                    const nextMatchIdx = Math.floor(mIdx / 2);
                    const isTeam1 = mIdx % 2 === 0;
                    const nextMatch = wBracket[nextRoundIdx]?.[nextMatchIdx];
                    if (nextMatch) {
                      if (isTeam1) nextMatch.team1 = winnerTeam;
                      else nextMatch.team2 = winnerTeam;
                    }
                  }
                  tourney.bracketRounds = wBracket;
                }
              }
              return true;
            }
          }
        }
        return false;
      };

      if (!updated && wBracket.length > 0)
        updated = searchAndApply(wBracket, "w");
      if (!updated && lBracket.length > 0)
        updated = searchAndApply(lBracket, "l");
      if (!updated && gFinal.length > 0) updated = searchAndApply(gFinal, "gf");
    }

    if (!updated && tourney.groups) {
      for (const group of tourney.groups) {
        for (const m of group.matches) {
          if (!m || !m.team1 || !m.team2) continue;
          const m1 = normalize(m.team1.name || "");
          const m2 = normalize(m.team2.name || "");

          if (
            (m1 === name1 && m2 === name2) ||
            (m1 === name2 && m2 === name1)
          ) {
            m.score1 = m1 === name1 ? team1Score : team2Score;
            m.score2 = m1 === name1 ? team2Score : team1Score;
            if (m.score1 > m.score2) m.winnerId = m.team1.id;
            else if (m.score2 > m.score1) m.winnerId = m.team2.id;
            else m.isDraw = true;
            updated = true;
            break;
          }
        }
        if (updated) break;
      }
    }

    if (!updated && tourney.swissRounds) {
      for (let rIdx = 0; rIdx < tourney.swissRounds.length; rIdx++) {
        const round = tourney.swissRounds[rIdx];
        if (!Array.isArray(round)) continue;
        for (let mIdx = 0; mIdx < round.length; mIdx++) {
          const m = round[mIdx];
          if (!m || !m.team1 || !m.team2) continue;
          const m1 = normalize(m.team1.name || "");
          const m2 = normalize(m.team2.name || "");

          if (
            (m1 === name1 && m2 === name2) ||
            (m1 === name2 && m2 === name1)
          ) {
            m.score1 = m1 === name1 ? team1Score : team2Score;
            m.score2 = m1 === name1 ? team2Score : team1Score;
            m.winnerId =
              m.score1 > m.score2
                ? m.team1.id
                : m.score2 > m.score1
                  ? m.team2.id
                  : null;
            m.isFinished = true;
            updated = true;

            // Check if round is finished and generate next if needed
            const isRoundFinished = round.every(rm => rm.isFinished || (rm.team1?.id === 'BYE' || rm.team2?.id === 'BYE'));
            if (isRoundFinished) {
               const winsToAdvance = tourney.settings?.swissWinsToAdvance || 3;
               const lossesToEliminate = tourney.settings?.swissLossesToEliminate || 3;
               const nextRound = generateNextSwissRound(tourney.teams || [], tourney.swissRounds, winsToAdvance, lossesToEliminate);
               if (nextRound) {
                  tourney.swissRounds.push(nextRound);
               }
            }
            break;
          }
        }
        if (updated) break;
      }
    }

    if (!updated && tourney.gslGroups) {
      for (let gIdx = 0; gIdx < tourney.gslGroups.length; gIdx++) {
        const g = tourney.gslGroups[gIdx];
        const advanceCount = tourney.settings?.gslAdvanceCount || 3;
        
        let foundInBracket: 'upper' | 'lower' | null = null;
        let foundRIdx = -1;
        let foundMIdx = -1;

        const checkBracket = (b: any[], type: 'upper' | 'lower') => {
          for (let r = 0; r < b.length; r++) {
            for (let m = 0; m < b[r].length; m++) {
              const match = b[r][m];
              if (!match || !match.team1 || !match.team2) continue;
              const m1 = normalize(match.team1.name || "");
              const m2 = normalize(match.team2.name || "");
              if ((m1 === name1 && m2 === name2) || (m1 === name2 && m2 === name1)) {
                foundInBracket = type;
                foundRIdx = r;
                foundMIdx = m;
                return true;
              }
            }
          }
          return false;
        };

        if (checkBracket(g.upperBracket, 'upper') || checkBracket(g.lowerBracket, 'lower')) {
            const updatedGroup = updateGslMatch(g, foundInBracket!, foundRIdx, foundMIdx, team1Score, team2Score, advanceCount);
            tourney.gslGroups[gIdx] = updatedGroup;
            updated = true;
            
            // Auto-advance to tiered playoff if all GSL groups finished
            const allFinished = tourney.gslGroups.every(group => {
               const standings = getGslGroupStandings(group, advanceCount);
               return standings.isGroupFinished;
            });
            
            if (allFinished && tourney.activeStage === 1) {
               const stage2Type = tourney.settings?.stage2Type || 'tiered';
               if (stage2Type === 'tiered') {
                  tourney.tieredBracketRounds = generateTieredPlayoffBracket(tourney.gslGroups, advanceCount);
                  tourney.activeStage = 2;
               }
            }
            break;
        }
      }
    }

    if (!updated && tourney.tieredBracketRounds) {
      const rounds = tourney.tieredBracketRounds;
      let foundR = -1;
      let foundM = -1;

      for (let r = 0; r < rounds.length; r++) {
        for (let m = 0; m < rounds[r].length; m++) {
          const match = rounds[r][m];
          if (!match || !match.team1 || !match.team2) continue;
          const m1 = normalize(match.team1.name || "");
          const m2 = normalize(match.team2.name || "");
          if ((m1 === name1 && m2 === name2) || (m1 === name2 && m2 === name1)) {
            foundR = r;
            foundM = m;
            break;
          }
        }
        if (foundR !== -1) break;
      }

      if (foundR !== -1) {
         tourney.tieredBracketRounds = advanceTieredPlayoffMatch(rounds, foundR, foundM, team1Score, team2Score);
         updated = true;
      }
    }

    if (updated) {
      saveTournament(userId, tourney);
    }
  } catch (err) {
    console.error("Error updating beta tournament match result:", err);
  }
};
