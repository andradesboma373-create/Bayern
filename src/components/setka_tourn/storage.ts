import { Tournament } from "./types";
import {
  cascadeAdvancements,
  advanceDoubleElimMatch,
} from "./doubleEliminationLogic";
import { BYE_TEAM } from "./doubleEliminationLogic";
import { db, deleteDoc, doc, setDoc } from "../../firebase";
import { safeLocalStorageSet } from "../../lib/utils";

let memoryCache: Record<string, Tournament[]> = {};

// Helper: resolve canonical room ID for data isolation and sharing across devices and accounts in the same room
export const getCanonicalRoomId = (userId?: string): string => {
  if (userId) {
    let clean = String(userId).trim();
    if (clean.includes('@')) {
      clean = clean.split('@')[0];
    }
    if (clean.startsWith('channel_')) return clean;
    // Map known default accounts to room
    if (clean === 'bamep' || clean === 'zeixst') return 'channel_bamep_cs2';
    if (clean === 'simu') return 'channel_simu';
    if (clean === 'airy') return 'channel_airy';
    return clean;
  }

  try {
    const raw = localStorage.getItem('customUser');
    if (raw) {
      const u = JSON.parse(raw);
      if (u && (u.channelId || u.uid)) {
        let ch = String(u.channelId || u.uid);
        if (ch.includes('@')) ch = ch.split('@')[0];
        if (ch.startsWith('channel_')) return ch;
        if (ch === 'bamep' || ch === 'zeixst') return 'channel_bamep_cs2';
        return ch;
      }
    }
  } catch (e) {}
  
  return 'guest';
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
      // Also check standard aliases
      "tournaments_channel_bamep_cs2",
      "tournaments_bamep",
      "tournaments_zeixst"
    ];

    // 1. Load from monolithic lists
    for (const key of checkKeys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const list: Tournament[] = JSON.parse(raw);
          if (Array.isArray(list)) {
            for (const t of list) {
              if (t && t.id && !deletedIds.has(t.id)) {
                if (!mergedMap.has(t.id)) {
                  mergedMap.set(t.id, { ...t, channelId: roomId });
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
      `tournament_item_zeixst_`
    ];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && prefixes.some(p => k.startsWith(p))) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              const t: Tournament = JSON.parse(raw);
              if (t && t.id && !deletedIds.has(t.id)) {
                const existing = mergedMap.get(t.id);
                mergedMap.set(t.id, { ...existing, ...t, channelId: roomId });
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {}

    // 3. Attach background images for each tournament if stored separately
    const tournaments: Tournament[] = [];
    for (const [id, t] of mergedMap.entries()) {
      if (deletedIds.has(id)) continue;
      const copy = { ...t };
      const isolatedBg = getTournamentBgImage(id);
      if (isolatedBg) {
        copy.settings = { ...copy.settings, bgImage: isolatedBg };
      }
      tournaments.push(copy);
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
        const serverTourneys: Tournament[] = data.tournaments;
        const local = loadTournaments(roomId, true);
        const deletedIds = getDeletedTournamentIds(roomId);

        const mergedMap = new Map<string, Tournament>();
        // Server items first
        for (const t of serverTourneys) {
          if (t && t.id && !deletedIds.has(t.id)) {
            mergedMap.set(t.id, { ...t, channelId: roomId });
          }
        }
        // Local items second
        for (const t of local) {
          if (t && t.id && !deletedIds.has(t.id)) {
            const serverT = mergedMap.get(t.id);
            mergedMap.set(t.id, serverT ? { ...serverT, ...t, channelId: roomId } : t);
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
      setDoc(doc(db, "tournaments", tournament.id), tourneyToSave).catch(e => console.error("Database sync error", e));
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
  addDeletedTournamentId(roomId, tournamentId);

  const all = loadTournaments(roomId);
  const filtered = all.filter((t) => t.id !== tournamentId);
  memoryCache[roomId] = [...filtered];
  if (userId && userId !== roomId) {
    memoryCache[userId] = [...filtered];
  }

  try {
    // Remove individual tournament files
    localStorage.removeItem(`tournament_item_${roomId}_${tournamentId}`);
    localStorage.removeItem(`tournament_bg_${tournamentId}`);
    if (userId && userId !== roomId) {
      localStorage.removeItem(`tournament_item_${userId}_${tournamentId}`);
    }
  } catch (e) {}

  saveTournamentsIndex(roomId, filtered);
  window.dispatchEvent(new Event("tournaments-updated"));

  if (roomId !== 'guest') {
    import('../../firebase').then(({ db, doc, deleteDoc }) => {
      deleteDoc(doc(db, "tournaments", tournamentId)).catch(e => console.error("Firebase delete error", e));
    }).catch(console.error);

    fetch('/api/sync-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: roomId, tournaments: filtered })
    }).catch(() => {});
  }
};

export const saveTournaments = (userId: string, tournaments: Tournament[]) => {
  const roomId = getCanonicalRoomId(userId);
  memoryCache[roomId] = [...tournaments];
  if (userId && userId !== roomId) {
    memoryCache[userId] = [...tournaments];
  }
  for (const t of tournaments) {
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
      for (const round of tourney.swissRounds) {
        if (!Array.isArray(round)) continue;
        for (const m of round) {
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
            break;
          }
        }
        if (updated) break;
      }
    }

    if (updated) {
      saveTournament(userId, tourney);
    }
  } catch (err) {
    console.error("Error updating beta tournament match result:", err);
  }
};
