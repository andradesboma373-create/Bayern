import { Tournament } from "./types";
import { db, doc, setDoc, deleteDoc } from "../../firebase";

let tournamentMemoryCache: Record<string, Tournament[]> = {};

export function ensureArrayOfRounds(rounds: any, json?: string): any[][] | null {
  if (Array.isArray(rounds)) return rounds;
  if (json) {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return null;
}

export function ensureArrayOfMatches(matches: any, json?: string): any[] | null {
  if (Array.isArray(matches)) return matches;
  if (json) {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return null;
}

export function ensureArrayOfQualifiers(qualifiers: any, json?: string): any[] | null {
  if (Array.isArray(qualifiers)) return qualifiers;
  if (json) {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return null;
}

export function normalizeTournament(t: any): any {
  if (!t || typeof t !== "object") return t;
  const res = { ...t };
  if (!res.settings || typeof res.settings !== "object") {
    res.settings = { mode: "single_stage", stage1Type: "playoff" };
  } else {
    res.settings = { ...res.settings };
  }

  const br = ensureArrayOfRounds(res.bracketRounds, res.bracketRounds_json);
  if (br) res.bracketRounds = br;

  const lbr = ensureArrayOfRounds(res.losersBracketRounds, res.losersBracketRounds_json);
  if (lbr) res.losersBracketRounds = lbr;

  const sr = ensureArrayOfRounds(res.swissRounds, res.swissRounds_json);
  if (sr) res.swissRounds = sr;

  const tr = ensureArrayOfRounds(res.tieredBracketRounds, res.tieredBracketRounds_json);
  if (tr) res.tieredBracketRounds = tr;

  const gf = ensureArrayOfMatches(res.grandFinal, res.grandFinal_json);
  if (gf) res.grandFinal = gf;

  const qb = ensureArrayOfQualifiers(res.qualifiersBrackets, res.qualifiersBrackets_json);
  if (qb) res.qualifiersBrackets = qb;

  if (res.gslGroups_json && (!res.gslGroups || !Array.isArray(res.gslGroups))) {
    try { res.gslGroups = JSON.parse(res.gslGroups_json); } catch {}
  }
  if (res.groups_json && (!res.groups || !Array.isArray(res.groups))) {
    try { res.groups = JSON.parse(res.groups_json); } catch {}
  }

  return res;
}

export function serializeTournamentForFirestore(t: any): any {
  if (!t) return t;
  const s = { ...t };
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
  if (Array.isArray(s.tieredBracketRounds)) {
    s.tieredBracketRounds_json = JSON.stringify(s.tieredBracketRounds);
    delete s.tieredBracketRounds;
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
}

export function deserializeTournamentFromFirestore(t: any): any {
  if (!t) return t;
  const s = { ...t };
  const br = ensureArrayOfRounds(s.bracketRounds, s.bracketRounds_json);
  if (br) s.bracketRounds = br;
  const lbr = ensureArrayOfRounds(s.losersBracketRounds, s.losersBracketRounds_json);
  if (lbr) s.losersBracketRounds = lbr;
  const sr = ensureArrayOfRounds(s.swissRounds, s.swissRounds_json);
  if (sr) s.swissRounds = sr;
  const tr = ensureArrayOfRounds(s.tieredBracketRounds, s.tieredBracketRounds_json);
  if (tr) s.tieredBracketRounds = tr;
  const qb = ensureArrayOfQualifiers(s.qualifiersBrackets, s.qualifiersBrackets_json);
  if (qb) s.qualifiersBrackets = qb;
  const gf = ensureArrayOfMatches(s.grandFinal, s.grandFinal_json);
  if (gf) s.grandFinal = gf;

  if (s.gslGroups_json && (!s.gslGroups || !Array.isArray(s.gslGroups))) {
    try { s.gslGroups = JSON.parse(s.gslGroups_json); } catch {}
  }
  if (s.groups_json && (!s.groups || !Array.isArray(s.groups))) {
    try { s.groups = JSON.parse(s.groups_json); } catch {}
  }
  return normalizeTournament(s);
}

export function getCanonicalRoomId(userId?: string, gameMode?: string): string {
  let roomId = "guest";
  if (userId) {
    let clean = String(userId).trim();
    if (clean.includes("@")) clean = clean.split("@")[0];
    if (clean.startsWith("channel_")) {
      roomId = clean;
    } else if (clean === "bamep" || clean === "zeixst") {
      roomId = "channel_bamep_cs2";
    } else if (clean === "simu") {
      roomId = "channel_simu";
    } else if (clean === "airy") {
      roomId = "channel_airy";
    } else {
      roomId = clean;
    }
  } else {
    try {
      const customUserStr = localStorage.getItem("customUser");
      if (customUserStr) {
        const customUser = JSON.parse(customUserStr);
        if (customUser && (customUser.channelId || customUser.uid)) {
          let clean = String(customUser.channelId || customUser.uid);
          if (clean.includes("@")) clean = clean.split("@")[0];
          if (clean.startsWith("channel_")) roomId = clean;
          else if (clean === "bamep" || clean === "zeixst") roomId = "channel_bamep_cs2";
          else if (clean === "simu") roomId = "channel_simu";
          else if (clean === "airy") roomId = "channel_airy";
          else roomId = clean;
        }
      }
    } catch {}
  }

  if (gameMode === "so2") {
    if (roomId === "channel_bamep_cs2") return "channel_bamep_so2";
    if (!roomId.endsWith("_so2")) return `${roomId}_so2`;
  } else if (gameMode === "cs2" && roomId === "channel_bamep_so2") {
    return "channel_bamep_cs2";
  }

  return roomId;
}

export function getTournamentBgImage(id: string): string | null {
  try {
    const bg = localStorage.getItem(`tournament_bg_${id}`);
    return bg && bg !== "null" && bg !== "undefined" && bg.trim() !== "" ? bg : null;
  } catch {
    return null;
  }
}

export function setTournamentBgImage(id: string, bg: string | null): void {
  try {
    if (bg && bg !== "null" && bg !== "undefined" && bg.trim() !== "") {
      localStorage.setItem(`tournament_bg_${id}`, bg);
    } else {
      localStorage.removeItem(`tournament_bg_${id}`);
    }
  } catch (err) {
    console.warn("Could not save background image for tournament " + id, err);
  }
}

export function getTournamentLogoUrl(id: string): string | null {
  try {
    const logo = localStorage.getItem(`tournament_logo_${id}`);
    return logo && logo !== "null" && logo !== "undefined" && logo.trim() !== "" ? logo : null;
  } catch {
    return null;
  }
}

export function setTournamentLogoUrl(id: string, logo: string | null): void {
  try {
    if (logo && logo !== "null" && logo !== "undefined" && logo.trim() !== "") {
      localStorage.setItem(`tournament_logo_${id}`, logo);
    } else if (logo === null || logo === "") {
      localStorage.removeItem(`tournament_logo_${id}`);
    }
  } catch (err) {
    console.warn("Could not save logo for tournament " + id, err);
  }
}

export function getDeletedTournamentIds(roomId: string): Set<string> {
  try {
    const canonical = getCanonicalRoomId(roomId);
    const raw = localStorage.getItem(`deleted_tournaments_${canonical}`) || localStorage.getItem(`deleted_tournaments_${roomId}`);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function addDeletedTournamentId(roomId: string, tournamentId: string): void {
  try {
    const canonical = getCanonicalRoomId(roomId);
    const set = getDeletedTournamentIds(canonical);
    set.add(tournamentId);
    const str = JSON.stringify(Array.from(set));
    localStorage.setItem(`deleted_tournaments_${canonical}`, str);
    if (roomId !== canonical) localStorage.setItem(`deleted_tournaments_${roomId}`, str);
  } catch {}
}

export function removeDeletedTournamentId(roomId: string, tournamentId: string): void {
  try {
    const canonical = getCanonicalRoomId(roomId);
    const set = getDeletedTournamentIds(canonical);
    set.delete(tournamentId);
    const str = JSON.stringify(Array.from(set));
    localStorage.setItem(`deleted_tournaments_${canonical}`, str);
    if (roomId !== canonical) localStorage.setItem(`deleted_tournaments_${roomId}`, str);
  } catch {}
}

export function compactTournamentForStorage(t: any): any {
  if (!t) return t;
  try {
    const copy = JSON.parse(JSON.stringify(t));
    if (copy.settings?.bgImage && copy.settings.bgImage.startsWith("data:image")) {
      setTournamentBgImage(copy.id, copy.settings.bgImage);
      copy.settings.bgImage = undefined;
    }
    const cleanMatches = (matches: any[]) => {
      if (Array.isArray(matches)) {
        return matches.filter(m => {
          if (!m) return false;
          const hasTeams = (m.team1 && m.team1.name && m.team1.name.trim() !== "") || (m.team2 && m.team2.name && m.team2.name.trim() !== "");
          const hasScore = (m.score1 > 0 || m.score2 > 0);
          const hasWinner = Boolean(m.winnerId);
          return hasTeams || hasScore || hasWinner;
        }).map(m => {
          if (m.team1?.logoUrl?.startsWith("data:image")) m.team1.logoUrl = undefined;
          if (m.team2?.logoUrl?.startsWith("data:image")) m.team2.logoUrl = undefined;
          return m;
        });
      }
      return matches;
    };
    if (Array.isArray(copy.bracketRounds)) {
      copy.bracketRounds = copy.bracketRounds.map((round: any[]) => cleanMatches(round)).filter((round: any[]) => Array.isArray(round) && round.length > 0);
    }
    if (Array.isArray(copy.losersBracketRounds)) {
      copy.losersBracketRounds = copy.losersBracketRounds.map((round: any[]) => cleanMatches(round)).filter((round: any[]) => Array.isArray(round) && round.length > 0);
    }
    if (Array.isArray(copy.swissRounds)) {
      copy.swissRounds = copy.swissRounds.map((round: any[]) => cleanMatches(round)).filter((round: any[]) => Array.isArray(round) && round.length > 0);
    }
    if (Array.isArray(copy.tieredBracketRounds)) {
      copy.tieredBracketRounds = copy.tieredBracketRounds.map((round: any[]) => cleanMatches(round)).filter((round: any[]) => Array.isArray(round) && round.length > 0);
    }
    if (copy.grandFinal) copy.grandFinal = cleanMatches(copy.grandFinal);
    copy.groups?.forEach((g: any) => { if (g.matches) g.matches = cleanMatches(g.matches); });
    copy.gslGroups?.forEach((g: any) => {
      g.upperBracket?.forEach(cleanMatches);
      g.lowerBracket?.forEach(cleanMatches);
    });
    return copy;
  } catch {
    return t;
  }
}

export function cleanupTournamentStorageQuota(roomId: string): void {
  try {
    const keysToRemove: string[] = [];
    const canonical = getCanonicalRoomId(roomId);
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith("player_avatar_") || k.startsWith("team_logo_")) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
  } catch {}
}

function saveTournamentItem(roomId: string, t: any): void {
  if (!t || !t.id) return;
  const canonical = getCanonicalRoomId(roomId);
  const key = `tournament_item_${canonical}_${t.id}`;
  const compacted = compactTournamentForStorage(t);
  compacted.channelId = canonical;
  let str = JSON.stringify(compacted);
  if (str.length > 1000000) {
    str = str.replace(/"data:image\/[^;]+;base64,[^"]{10000,}"/g, "null");
  }
  try {
    localStorage.setItem(key, str);
  } catch (err) {
    console.warn("Storage quota warning on saving tournament " + t.id + ", performing cleanup...", err);
    cleanupTournamentStorageQuota(canonical);
    try {
      localStorage.setItem(key, str);
    } catch {
      try {
        const stripped = str.replace(/"data:image\/[^;]+;base64,[^"]+"/g, "null");
        localStorage.setItem(key, stripped);
      } catch {}
    }
  }
}

function saveTournamentsIndex(roomId: string, list: any[]): void {
  const canonical = getCanonicalRoomId(roomId);
  try {
    const indexKey = "tournaments_index_" + canonical;
    const mini = list.map(u => ({
      id: u.id,
      name: u.name,
      activeStage: u.activeStage,
      completed: u.completed,
      winnerName: u.winnerName,
      logoUrl: u.logoUrl,
      prizePool: u.prizePool
    }));
    localStorage.setItem(indexKey, JSON.stringify(mini));
  } catch {
    cleanupTournamentStorageQuota(canonical);
  }
}

export function loadTournaments(roomId: string, bypassCache: boolean = false): Tournament[] {
  const canonical = getCanonicalRoomId(roomId);
  if (!bypassCache && tournamentMemoryCache[canonical] && tournamentMemoryCache[canonical].length > 0) {
    return tournamentMemoryCache[canonical];
  }

  try {
    const deleted = getDeletedTournamentIds(canonical);
    const map = new Map<string, any>();
    const keys = [
      "tournaments_" + canonical,
      "tournaments_item_" + canonical,
      "tournaments_channel_bamep_cs2",
      "tournaments_bamep",
      "tournaments_data"
    ];

    for (const key of keys) {
      const val = localStorage.getItem(key);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item && item.id && !deleted.has(item.id)) {
                if (!map.has(item.id)) {
                  map.set(item.id, normalizeTournament({ ...item, channelId: canonical }));
                }
              }
            }
          }
        } catch {}
      }
    }

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(`tournament_item_${canonical}_`) || k.startsWith("tournament_item_"))) {
        const itemStr = localStorage.getItem(k);
        if (itemStr) {
          try {
            const item = JSON.parse(itemStr);
            if (item && item.id && !deleted.has(item.id)) {
              const existing = map.get(item.id);
              map.set(item.id, normalizeTournament(existing ? { ...existing, ...item } : { ...item, channelId: canonical }));
            }
          } catch {}
        }
      }
    }

    const result: Tournament[] = [];
    for (const [id, item] of map.entries()) {
      if (deleted.has(id)) continue;
      const copy = { ...item };
      const bg = getTournamentBgImage(id);
      if (bg) copy.settings = { ...copy.settings, bgImage: bg };
      const logo = getTournamentLogoUrl(id);
      if (logo && (!copy.logoUrl || copy.logoUrl.trim() === "")) copy.logoUrl = logo;
      result.push(normalizeTournament(copy));
    }

    tournamentMemoryCache[canonical] = result;
    if (roomId !== canonical) tournamentMemoryCache[roomId] = result;
    return result;
  } catch (err) {
    console.error("Error loading tournaments:", err);
    return [];
  }
}

export function saveTournament(roomId: string, t: any): void {
  const canonical = getCanonicalRoomId(roomId);
  if (t.id) removeDeletedTournamentId(canonical, t.id);
  if (t.logoUrl) setTournamentLogoUrl(t.id, t.logoUrl);
  if (t.settings?.bgImage) setTournamentBgImage(t.id, t.settings.bgImage);

  const list = loadTournaments(canonical, true);
  const idx = list.findIndex(item => item.id === t.id);
  const full = { ...t, channelId: canonical, userId: canonical };
  if (idx >= 0) list[idx] = full;
  else list.push(full);

  tournamentMemoryCache[canonical] = [...list];
  if (roomId !== canonical) tournamentMemoryCache[roomId] = [...list];

  saveTournamentItem(canonical, full);
  saveTournamentsIndex(canonical, list);

  window.dispatchEvent(new Event("tournaments-updated"));

  if (t.id && canonical !== "guest") {
    try {
      setDoc(doc(db, "tournaments", t.id), serializeTournamentForFirestore(full), { merge: true }).catch(() => {});
      fetch("/api/sync-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: canonical, tournaments: [compactTournamentForStorage(full)] })
      }).catch(() => {});
    } catch {}
  }
}

export function deleteTournament(roomId: string, id: string): void {
  const canonical = getCanonicalRoomId(roomId);
  addDeletedTournamentId(canonical, id);
  const list = loadTournaments(canonical, true).filter(item => item.id !== id);

  tournamentMemoryCache[canonical] = [...list];
  if (roomId !== canonical) tournamentMemoryCache[roomId] = [...list];

  try {
    localStorage.removeItem(`tournament_item_${canonical}_${id}`);
    localStorage.removeItem(`tournament_bg_${id}`);
    localStorage.removeItem(`tournament_logo_${id}`);
  } catch {}

  saveTournamentsIndex(canonical, list);
  window.dispatchEvent(new Event("tournaments-updated"));

  if (canonical !== "guest") {
    try {
      deleteDoc(doc(db, "tournaments", id)).catch(() => {});
      fetch("/api/sync-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: canonical, tournaments: list })
      }).catch(() => {});
    } catch {}
  }
}

export function saveTournaments(roomId: string, list: Tournament[]): void {
  const canonical = getCanonicalRoomId(roomId);
  tournamentMemoryCache[canonical] = [...list];
  if (roomId !== canonical) tournamentMemoryCache[roomId] = [...list];

  for (const item of list) {
    if (item.settings?.bgImage) setTournamentBgImage(item.id, item.settings.bgImage);
    if (item.logoUrl) setTournamentLogoUrl(item.id, item.logoUrl);
    saveTournamentItem(canonical, item);
  }
  saveTournamentsIndex(canonical, list);
  window.dispatchEvent(new Event("tournaments-updated"));
}

export function clearRoomTournaments(roomId: string): void {
  const canonical = getCanonicalRoomId(roomId);
  try {
    (tournamentMemoryCache[canonical] || []).forEach(t => {
      if (t && t.id) addDeletedTournamentId(canonical, t.id);
    });
  } catch {}
  tournamentMemoryCache[canonical] = [];
  if (roomId !== canonical) tournamentMemoryCache[roomId] = [];
  try {
    localStorage.removeItem(`tournaments_${canonical}`);
  } catch {}
  saveTournamentsIndex(canonical, []);
  window.dispatchEvent(new Event("tournaments-updated"));
}

export async function syncTournamentsWithServer(roomId: string): Promise<Tournament[]> {
  const canonical = getCanonicalRoomId(roomId);
  if (!canonical || canonical === "guest") return loadTournaments(roomId);

  try {
    const res = await fetch(`/api/backup-data/${canonical}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.tournaments)) {
        const serverTournaments = data.tournaments.map(deserializeTournamentFromFirestore);
        const local = loadTournaments(canonical, true);
        const deleted = getDeletedTournamentIds(canonical);
        const map = new Map<string, any>();

        for (const t of serverTournaments) {
          if (t && t.id && !deleted.has(t.id)) {
            map.set(t.id, normalizeTournament({ ...t, channelId: canonical }));
          }
        }
        for (const t of local) {
          if (t && t.id && !deleted.has(t.id)) {
            const existing = map.get(t.id);
            map.set(t.id, normalizeTournament(existing ? { ...existing, ...t } : t));
          }
        }

        const merged = Array.from(map.values());
        saveTournaments(canonical, merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn("Could not sync tournaments from backend:", err);
  }
  return loadTournaments(canonical);
}

export function updateBetaTournamentMatchResult(...args: any[]): void {
  console.log("[Tournament Storage] updateBetaTournamentMatchResult called", args);
}
