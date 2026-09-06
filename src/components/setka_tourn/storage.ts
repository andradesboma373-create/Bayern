import { Tournament } from "./types";
import {
  cascadeAdvancements,
  advanceDoubleElimMatch,
} from "./doubleEliminationLogic";
import { BYE_TEAM } from "./doubleEliminationLogic";
import { db, deleteDoc, doc, setDoc } from "../../firebase";

let memoryCache: Record<string, Tournament[]> = {};

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
    const raw = localStorage.getItem(`deleted_tournaments_${userId}`);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
};

export const addDeletedTournamentId = (userId: string, id: string) => {
  try {
    const set = getDeletedTournamentIds(userId);
    set.add(id);
    localStorage.setItem(`deleted_tournaments_${userId}`, JSON.stringify(Array.from(set)));
  } catch (e) {}
};

export const removeDeletedTournamentId = (userId: string, id: string) => {
  try {
    const set = getDeletedTournamentIds(userId);
    set.delete(id);
    localStorage.setItem(`deleted_tournaments_${userId}`, JSON.stringify(Array.from(set)));
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
  if (!forceReload && memoryCache[userId] && memoryCache[userId].length > 0) {
    return memoryCache[userId];
  }

  try {
    const deletedIds = getDeletedTournamentIds(userId);
    const mergedMap = new Map<string, Tournament>();

    // 1. Load from monolithic list "tournaments_${userId}"
    const legacyKey = "tournaments_" + userId;
    const legacyRaw = localStorage.getItem(legacyKey);
    if (legacyRaw) {
      try {
        const legacyList: Tournament[] = JSON.parse(legacyRaw);
        if (Array.isArray(legacyList)) {
          for (const t of legacyList) {
            if (t && t.id && !deletedIds.has(t.id)) {
              mergedMap.set(t.id, { ...t, channelId: userId });
            }
          }
        }
      } catch (e) {}
    }

    // 2. Load from index "tournaments_index_${userId}" + isolated items
    const indexKey = "tournaments_index_" + userId;
    const indexRaw = localStorage.getItem(indexKey);
    if (indexRaw) {
      try {
        const indexList: { id: string }[] = JSON.parse(indexRaw);
        if (Array.isArray(indexList)) {
          for (const item of indexList) {
            if (!item || !item.id || deletedIds.has(item.id)) continue;
            const singleKey = `tournament_item_${userId}_${item.id}`;
            const singleRaw = localStorage.getItem(singleKey);
            if (singleRaw) {
              try {
                const tourney: Tournament = JSON.parse(singleRaw);
                if (tourney && tourney.id && !deletedIds.has(tourney.id)) {
                  const existing = mergedMap.get(tourney.id);
                  mergedMap.set(tourney.id, { ...existing, ...tourney, channelId: userId });
                }
              } catch (err) {}
            }
          }
        }
      } catch (e) {}
    }

    // 3. Scan all keys in localStorage starting with tournament_item_${userId}_
    try {
      const prefix = `tournament_item_${userId}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              const t: Tournament = JSON.parse(raw);
              if (t && t.id && !deletedIds.has(t.id)) {
                const existing = mergedMap.get(t.id);
                mergedMap.set(t.id, { ...existing, ...t, channelId: userId });
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {}

    // 4. Attach background images for each tournament if stored separately
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

    memoryCache[userId] = tournaments;
    return tournaments;
  } catch (e) {
    console.error("Error loading tournaments:", e);
    return [];
  }
};

// Helper: perform emergency cleanup of legacy redundant caches to free up localStorage quota
export const cleanupTournamentStorageQuota = (userId?: string) => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      // Remove temporary heavy logo & avatar caches stored in localStorage
      if (k.startsWith('player_avatar_') || k.startsWith('team_logo_')) {
        keysToRemove.push(k);
      }
      // If specific user given, remove redundant monolithic duplicate keys
      if (userId && k === `tournaments_${userId}`) {
        keysToRemove.push(k);
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
  const singleKey = `tournament_item_${userId}_${tournament.id}`;
  
  // Extract bgImage if present to keep tournament object compact
  const bgImg = tournament.settings?.bgImage;
  if (bgImg) {
    setTournamentBgImage(tournament.id, bgImg);
  }

  let tourneyCopy = { ...tournament, channelId: userId };
  if (tourneyCopy.settings?.bgImage && tourneyCopy.settings.bgImage.startsWith('data:image')) {
    tourneyCopy.settings = { ...tourneyCopy.settings, bgImage: undefined };
  }

  let jsonStr = JSON.stringify(tourneyCopy);

  try {
    localStorage.setItem(singleKey, jsonStr);
  } catch (e) {
    console.warn("Storage quota warning on saving tournament " + tournament.id + ", performing cleanup...", e);
    cleanupTournamentStorageQuota(userId);
    try {
      // Retry after cleanup
      localStorage.setItem(singleKey, jsonStr);
    } catch (e2) {
      // Fallback: strip any base64 image strings or heavy logs
      try {
        const stripped = jsonStr.replace(/"data:image\/[^;]+;base64,[^"]+"/g, 'null');
        localStorage.setItem(singleKey, stripped);
      } catch (e3) {
        console.error("Critical: Could not write tournament item to localStorage:", e3);
      }
    }
  }
};

// Helper to save lightweight index of all tournaments for user
const saveTournamentsIndex = (userId: string, tournaments: Tournament[]) => {
  try {
    const indexKey = "tournaments_index_" + userId;
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

    // Try updating legacy key only as a lightweight summary list to prevent QuotaExceededError
    const legacyKey = "tournaments_" + userId;
    try {
      // Check if we can safely update legacy key with lightweight records
      const lightweightTourneys = tournaments.map(t => {
        const { bracketRounds, losersBracketRounds, swissRounds, groups, tieredBracketRounds, ...lightweight } = t;
        return lightweight;
      });
      localStorage.setItem(legacyKey, JSON.stringify(lightweightTourneys));
    } catch (legErr) {
      // If quota exceeded, simply remove the redundant monolithic key to save space
      try {
        localStorage.removeItem(legacyKey);
      } catch (e) {}
    }
  } catch (e) {
    cleanupTournamentStorageQuota(userId);
    try {
      const indexKey = "tournaments_index_" + userId;
      const indexList = tournaments.map(t => ({ id: t.id, name: t.name }));
      localStorage.setItem(indexKey, JSON.stringify(indexList));
    } catch (e2) {}
  }
};

export const saveTournament = (userId: string, tournament: Tournament) => {
  if (tournament.id) {
    removeDeletedTournamentId(userId, tournament.id);
  }
  const all = loadTournaments(userId);
  const index = all.findIndex((t) => t.id === tournament.id);
  const tourneyToSave = { ...tournament, channelId: userId };
  
  if (index >= 0) {
    all[index] = tourneyToSave;
  } else {
    all.push(tourneyToSave);
  }

  memoryCache[userId] = [...all];

  // 1. Save ONLY this single tournament into its isolated key
  saveSingleTournamentIsolated(userId, tourneyToSave);

  // 2. Save updated tournaments index
  saveTournamentsIndex(userId, all);

  window.dispatchEvent(new Event("tournaments-updated"));

  // Sync to firestore silently if not a guest
  if (tournament.id && userId !== 'guest') {
    import('../../firebase').then(({ db, doc, setDoc }) => {
      setDoc(doc(db, "tournaments", tournament.id), tourneyToSave).catch(e => console.error("Firebase sync error", e));
    }).catch(console.error);
  }
};

export const deleteTournament = (userId: string, tournamentId: string) => {
  addDeletedTournamentId(userId, tournamentId);
  const all = loadTournaments(userId);
  const filtered = all.filter((t) => t.id !== tournamentId);
  memoryCache[userId] = [...filtered];

  try {
    // Remove individual tournament files
    localStorage.removeItem(`tournament_item_${userId}_${tournamentId}`);
    localStorage.removeItem(`tournament_bg_${tournamentId}`);
  } catch (e) {}

  saveTournamentsIndex(userId, filtered);
  window.dispatchEvent(new Event("tournaments-updated"));

  if (userId !== 'guest') {
    import('../../firebase').then(({ db, doc, deleteDoc }) => {
      deleteDoc(doc(db, "tournaments", tournamentId)).catch(e => console.error("Firebase delete error", e));
    }).catch(console.error);
  }
};

export const saveTournaments = (userId: string, tournaments: Tournament[]) => {
  memoryCache[userId] = [...tournaments];
  for (const t of tournaments) {
    saveSingleTournamentIsolated(userId, t);
  }
  saveTournamentsIndex(userId, tournaments);
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
