import React, { useState, useMemo, useRef } from "react";
import {
  X, Upload,
  Trophy,
  Award,
  Shield,
  User,
  Download,
  Edit3,
  Sparkles,
  Crosshair,
  Zap,
  Flame,
  ExternalLink,
  Check,
  Calendar,
  DollarSign,
  Globe,
  BarChart3,
  Swords,
  Settings,
  Star,
  Medal,
} from "lucide-react";
import { toPng } from "html-to-image";
import { safeLocalStorageSet } from "../lib/utils";
import { calculateConsistencyFromMatchHistory } from "../lib/simulation";
import PlayerAvatar from "./PlayerAvatar";
import TeamLogo from "./TeamLogo";
import { loadTournaments } from "./setka_tourn/storage";
import {
  doc,
  updateDoc,
  writeBatch,
  db,
  collection,
  query,
  where,
  getDocs,
} from "../firebase";

interface PlayerProfileModalProps {
  player: {
    id?: string;
    nickname: string;
    role?: string;
    subclass?: string;
    rating?: number;
    valRating?: number;
    realName?: string;
    country?: string;
    age?: number;
    avatarUrl?: string;
    teamName?: string;
    isAcademy?: boolean;
    socials?: {
      twitter?: string;
      instagram?: string;
      faceit?: string;
    };
  };
  user: any;
  onClose: () => void;
  onUpdatePlayer?: (updatedData: any) => void;
}

const COUNTRY_NAMES: Record<string, { code: string; name: string }> = {
  RU: { code: "RU", name: "Россия" },
  UA: { code: "UA", name: "Украина" },
  KZ: { code: "KZ", name: "Казахстан" },
  BY: { code: "BY", name: "Беларусь" },
  DK: { code: "DK", name: "Дания" },
  SE: { code: "SE", name: "Швеция" },
  FR: { code: "FR", name: "Франция" },
  DE: { code: "DE", name: "Германия" },
  US: { code: "US", name: "США" },
  EU: { code: "EU", name: "Европа" },
  BR: { code: "BR", name: "Бразилия" },
  PL: { code: "PL", name: "Польша" },
  FI: { code: "FI", name: "Финляндия" },
  MN: { code: "MN", name: "Монголия" },
};

export default function PlayerProfileModal({
  player,
  user,
  onClose,
  onUpdatePlayer,
}: PlayerProfileModalProps) {
  const [activeTab, setActiveTab] = useState<
    "stats" | "matches" | "trophies" | "teams" | "edit"
  >("stats");
  const [isExporting, setIsExporting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const uid = user?.uid || "guest";

  // Local state for profile edits
  const [editNickname, setEditNickname] = useState(player.nickname || "");
  const [editRealName, setEditRealName] = useState(player.realName || "");
  const [editCountry, setEditCountry] = useState(player.country || "RU");
  const [editAge, setEditAge] = useState(player.age || 21);
  const [editRole, setEditRole] = useState(player.role || "rifler");
  const [editRating, setEditRating] = useState(player.rating || 100);
  const [editValRating, setEditValRating] = useState<number>(
    player.valRating || 0,
  );
  const [editAvatarUrl, setEditAvatarUrl] = useState(player.avatarUrl || "");
  const [editTwitter, setEditTwitter] = useState(player.socials?.twitter || "");
  const [editInstagram, setEditInstagram] = useState(
    player.socials?.instagram || "",
  );
  const [editFaceit, setEditFaceit] = useState(player.socials?.faceit || "");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load all tournament matches & calculate player HLTV statistics
  const playerStats = useMemo(() => {
    const localTourneys = loadTournaments(uid);
    const nick = (player.nickname || "").trim().toLowerCase();

    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let totalDamage = 0;
    let totalRounds = 0;
    let totalMvps = 0;
    let matchesCount = 0;

    const matchesList: any[] = [];
    const trophyList: any[] = [];
    let mvpCount = 0;
    let evpCount = 0;
    let totalPrizeMoney = 0;

    // Search teams to find player's team
    const localTeams = JSON.parse(localStorage.getItem(`teams_${uid}`) || "[]");
    const currentTeam = localTeams.find((t: any) =>
      t.players?.some(
        (tp: any) => (tp.nickname || "").trim().toLowerCase() === nick,
      ),
    );

    const globalMatches = JSON.parse(
      localStorage.getItem(`matches_${uid}`) || "[]",
    );

    const processMatchObj = (m: any, tourney: any) => {
      if (
        !m ||
        (m.team1Score === 0 &&
          m.team2Score === 0 &&
          !m.isFinished &&
          !m.completed)
      )
        return;

      let seriesK = 0,
        seriesD = 0,
        seriesA = 0,
        seriesDmg = 0,
        seriesR = 0,
        seriesMvps = 0;
      let hasStats = false;
      let isTeam1Global = false;

      const processStats = (st: any, mapObj: any, isTeam1: boolean) => {
        if (!st) return;
        const k = st.kills || 0;
        const d = st.deaths || 0;
        const a = st.assists || 0;
        const dmg = st.damage || 0;
        const r =
          st.totalRounds ||
          st.rounds ||
          mapObj.team1Score + mapObj.team2Score ||
          1;
        const mvp = st.mvps || 0;

        if (k === 0 && d === 0 && r <= 1) return;

        totalKills += k;
        totalDeaths += d;
        totalAssists += a;
        totalDamage += dmg;
        totalRounds += r;
        totalMvps += mvp;
        matchesCount++;

        seriesK += k;
        seriesD += d;
        seriesA += a;
        seriesDmg += dmg;
        seriesR += r;
        seriesMvps += mvp;
        hasStats = true;
        isTeam1Global = isTeam1;
      };

      if (m.maps && Array.isArray(m.maps) && m.maps.length > 0) {
        m.maps.forEach((mapObj: any) => {
          let st = null;
          let isTeam1 = false;
          if (mapObj.team1Stats && Array.isArray(mapObj.team1Stats)) {
            st = mapObj.team1Stats.find(
              (p: any) =>
                (p.nickname || "").trim().toLowerCase() === nick ||
                (p.id && p.id === player.id),
            );
            if (st) isTeam1 = true;
          }
          if (!st && mapObj.team2Stats && Array.isArray(mapObj.team2Stats)) {
            st = mapObj.team2Stats.find(
              (p: any) =>
                (p.nickname || "").trim().toLowerCase() === nick ||
                (p.id && p.id === player.id),
            );
          }
          processStats(st, mapObj, isTeam1);
        });

        if (hasStats) {
          const enemyTeam = isTeam1Global ? m.team2 : m.team1;
          const enemyName =
            enemyTeam?.name ||
            (isTeam1Global ? m.team2Name : m.team1Name) ||
            "Opponent";
          const myScore = isTeam1Global
            ? (m.score1 ?? m.team1Score ?? 0)
            : (m.score2 ?? m.team2Score ?? 0);
          const enemyScore = isTeam1Global
            ? (m.score2 ?? m.team2Score ?? 0)
            : (m.score1 ?? m.team1Score ?? 0);

          const mKd = seriesD > 0 ? seriesK / seriesD : seriesK;
          const mAdr = seriesR > 0 ? seriesDmg / seriesR : 0;
          const mImpact =
            0.8 +
            mKd * 0.3 +
            mAdr * 0.003 +
            (seriesA / Math.max(seriesR, 1)) * 0.1;
          const mRating = 0.5 + mKd * 0.35 + mAdr * 0.004 + mImpact * 0.15;

          matchesList.push({
            id: m.id || Math.random().toString(),
            tourneyName: tourney.name + ` (BO${m.maps.length})`,
            enemyTeamName: enemyName,
            enemyTeamLogo: enemyTeam?.logo || null,
            score: `${myScore ?? 0} : ${enemyScore ?? 0}`,
            won: myScore > enemyScore,
            kills: seriesK,
            deaths: seriesD,
            assists: seriesA,
            adr: Math.round(mAdr),
            rating: mRating.toFixed(2),
            date: tourney.createdAt
              ? new Date(tourney.createdAt).toLocaleDateString("ru-RU")
              : "2026",
          });
        }
      } else {
        let st = null;
        let isTeam1 = false;

        if (m.team1Stats && Array.isArray(m.team1Stats)) {
          st = m.team1Stats.find(
            (p: any) =>
              (p.nickname || "").trim().toLowerCase() === nick ||
              (p.id && p.id === player.id),
          );
          if (st) isTeam1 = true;
        }
        if (!st && m.team2Stats && Array.isArray(m.team2Stats)) {
          st = m.team2Stats.find(
            (p: any) =>
              (p.nickname || "").trim().toLowerCase() === nick ||
              (p.id && p.id === player.id),
          );
        }

        if (!st && m.playerStats) {
          let foundKey = Object.keys(m.playerStats).find(
            (k) => k.trim().toLowerCase() === nick,
          );
          if (!foundKey && player.id)
            foundKey = Object.keys(m.playerStats).find((k) => k === player.id);
          if (foundKey) {
            st = m.playerStats[foundKey];
            isTeam1 =
              m.team1?.name === currentTeam?.name ||
              m.team1?.players?.some(
                (tp: any) => (tp.nickname || "").trim().toLowerCase() === nick,
              );
          }
        }

        processStats(st, m, isTeam1);

        if (hasStats) {
          const enemyTeam = isTeam1Global ? m.team2 : m.team1;
          const enemyName =
            enemyTeam?.name ||
            (isTeam1Global ? m.team2Name : m.team1Name) ||
            "Opponent";
          const myScore = isTeam1Global
            ? (m.score1 ?? m.team1Score ?? 0)
            : (m.score2 ?? m.team2Score ?? 0);
          const enemyScore = isTeam1Global
            ? (m.score2 ?? m.team2Score ?? 0)
            : (m.score1 ?? m.team1Score ?? 0);

          const mKd = seriesD > 0 ? seriesK / seriesD : seriesK;
          const mAdr = seriesR > 0 ? seriesDmg / seriesR : 0;
          const mImpact =
            0.8 +
            mKd * 0.3 +
            mAdr * 0.003 +
            (seriesA / Math.max(seriesR, 1)) * 0.1;
          const mRating =
            parseFloat(st.hltvRating) ||
            0.5 + mKd * 0.35 + mAdr * 0.004 + mImpact * 0.15;

          matchesList.push({
            id: m.id || Math.random().toString(),
            tourneyName: tourney.name + (m.map ? ` (${m.map})` : ""),
            enemyTeamName: enemyName,
            enemyTeamLogo: enemyTeam?.logo || null,
            score: `${myScore ?? 0} : ${enemyScore ?? 0}`,
            won: myScore > enemyScore,
            kills: seriesK,
            deaths: seriesD,
            assists: seriesA,
            adr: Math.round(mAdr),
            rating: mRating.toFixed(2),
            date: tourney.createdAt
              ? new Date(tourney.createdAt).toLocaleDateString("ru-RU")
              : "2026",
          });
        }
      }
    };

    if (Array.isArray(globalMatches)) {
      globalMatches.forEach((m) => {
        processMatchObj(m, {
          name: m.tournamentName || "Товарищеский матч",
          createdAt: m.date || null,
        });
      });
    }

    // Process all tournaments for stats
    for (const tourney of localTourneys) {
      if (!tourney) continue;

      let tourneyMatches: any[] = [];
      if (tourney.bracketRounds) {
        tourneyMatches = tourney.bracketRounds.flat();
        if (tourney.losersBracketRounds) {
          tourneyMatches = tourneyMatches.concat(
            tourney.losersBracketRounds.flat(),
          );
        }
        if (tourney.grandFinal) {
          tourneyMatches = tourneyMatches.concat(tourney.grandFinal);
        }
      } else if (tourney.matches) {
        tourneyMatches = tourney.matches;
      }

      for (const m of tourneyMatches) {
        processMatchObj(m, tourney);
      }

      // Check tournament trophies & MVP awards
      if (tourney.completed || tourney.awards || tourney.mvpAward) {
        const hasMvp =
          (tourney.awards && tourney.awards.mvpId === player.id) ||
          (tourney.mvpAward &&
            (tourney.mvpAward.nickname || "").trim().toLowerCase() === nick);
        if (hasMvp) {
          mvpCount++;
          trophyList.push({
            title: `MVP — ${tourney.name}`,
            type: "mvp",
            date: tourney.createdAt
              ? new Date(tourney.createdAt).toLocaleDateString("ru-RU")
              : "2026",
          });
        }

        let isEvp = false;
        if (tourney.awards && Array.isArray(tourney.awards.evpIds)) {
          isEvp = tourney.awards.evpIds.includes(player.id);
        } else if (tourney.evpAwards && Array.isArray(tourney.evpAwards)) {
          isEvp = tourney.evpAwards.some(
            (evp: any) => (evp?.nickname || "").trim().toLowerCase() === nick,
          );
        }

        if (isEvp) {
          evpCount++;
          trophyList.push({
            title: `EVP — ${tourney.name}`,
            type: "evp",
            date: tourney.createdAt
              ? new Date(tourney.createdAt).toLocaleDateString("ru-RU")
              : "2026",
          });
        }

        // Winner trophy
        const winnerTeamStr =
          typeof tourney.winnerTeam === "string"
            ? tourney.winnerTeam
            : (tourney.winnerTeam as any)?.name || tourney.winnerName;
        if (
          winnerTeamStr &&
          currentTeam &&
          (winnerTeamStr.toLowerCase() === currentTeam.name?.toLowerCase() ||
            (tourney.winnerTeam as any)?.id === currentTeam.id)
        ) {
          trophyList.push({
            title: `Чемпион ${tourney.name}`,
            type: "winner",
            date: tourney.createdAt
              ? new Date(tourney.createdAt).toLocaleDateString("ru-RU")
              : "2026",
          });
          if (tourney.prizePool) {
            const numericPrize =
              parseFloat(String(tourney.prizePool).replace(/[^0-9.]/g, "")) ||
              0;
            totalPrizeMoney += Math.round((numericPrize * 0.5) / 5);
          }
        }
      }
    }

    // Default baseline if no matches played yet
    if (matchesCount === 0) {
      return {
        currentTeam,
        totalKills: 0,
        totalDeaths: 0,
        totalAssists: 0,
        totalDamage: 0,
        totalRounds: 0,
        matchesCount: 0,
        kd: 0,
        adr: 0,
        kpr: "0.00",
        dpr: "0.00",
        impact: "0.00",
        rating3: 0.0,
        tRating: 0.0,
        ctRating: 0.0,
        kast: 0,
        multikill: 0,
        roundSwing: "0.00",
        consistency: calculateConsistencyFromMatchHistory([], player.rating || 100),
        mvpCount,
        evpCount,
        totalPrizeMoney,
        matchesList,
        trophyList,
      };
    }

    const rounds = Math.max(totalRounds, 1);
    const kd =
      totalDeaths > 0
        ? totalKills / totalDeaths
        : totalKills > 0
          ? totalKills
          : 1.0;
    const adr = totalRounds > 0 ? totalDamage / totalRounds : 75;
    const kpr = (totalRounds > 0 ? totalKills / totalRounds : 0.7).toFixed(2);
    const dpr = (totalRounds > 0 ? totalDeaths / totalRounds : 0.65).toFixed(2);
    const impact = 0.8 + kd * 0.3 + adr * 0.003 + (totalAssists / rounds) * 0.1;

    // HLTV Rating 3.0 calculation
    const baseRating = 0.5 + kd * 0.35 + adr * 0.004 + impact * 0.15;

    const rating3 = Number(baseRating.toFixed(2));
    const tRating = Number((rating3 * 0.97).toFixed(2));
    const ctRating = Number((rating3 * 1.03).toFixed(2));

    // KAST & Multi-kill %
    const kast = Math.min(
      92,
      Math.max(55, Math.round(62 + (rating3 - 1) * 25)),
    );
    const multikill = Math.min(
      45,
      Math.max(12, Number((Number(kpr) * 28).toFixed(1))),
    );
    const roundSwing = ((rating3 - 1) * 12).toFixed(2);

    // Consistency Index calculation based on past matches
    const matchRatings = matchesList
      .map((m) => parseFloat(m.rating))
      .filter((r) => !isNaN(r) && r > 0);

    const consistency = calculateConsistencyFromMatchHistory(
      matchRatings,
      rating3 > 10 ? rating3 : rating3 * 100
    );

    return {
      currentTeam,
      totalKills,
      totalDeaths,
      totalAssists,
      totalDamage,
      totalRounds,
      matchesCount,
      kd,
      adr: Math.round(adr),
      kpr,
      dpr,
      impact: impact.toFixed(2),
      rating3,
      tRating,
      ctRating,
      kast,
      multikill,
      roundSwing,
      consistency,
      mvpCount,
      evpCount,
      totalPrizeMoney,
      matchesList,
      trophyList,
    };
  }, [uid, player]);

  const ratingLabel = useMemo(() => {
    const r = playerStats.rating3;
    if (r >= 1.35)
      return {
        text: "GODLIKE",
        color: "text-[#ff8f00]",
        bg: "bg-[#ff8f00]/20 border-[#ff8f00]",
      };
    if (r >= 1.2)
      return {
        text: "GREAT",
        color: "text-emerald-400",
        bg: "bg-emerald-500/20 border-emerald-500",
      };
    if (r >= 1.05)
      return {
        text: "GOOD",
        color: "text-blue-400",
        bg: "bg-blue-500/20 border-blue-500",
      };
    if (r >= 0.9)
      return {
        text: "AVERAGE",
        color: "text-slate-300",
        bg: "bg-white/10 border-white/20",
      };
    return {
      text: "POOR",
      color: "text-red-400",
      bg: "bg-red-500/20 border-red-500",
    };
  }, [playerStats.rating3]);

  const handleDownloadPng = async () => {
    if (!modalRef.current) return;
    setIsExporting(true);
    try {
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 200)));
      const transparentPlaceholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      let dataUrl: string;
      try {
        dataUrl = await toPng(modalRef.current, {
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: "#11121c",
          skipFonts: true,
          fontEmbedCSS: '',
          imagePlaceholder: transparentPlaceholder,
          cacheBust: true,
        });
      } catch (e) {
        dataUrl = await toPng(modalRef.current, {
          quality: 0.9,
          pixelRatio: 1.5,
          backgroundColor: "#11121c",
          skipFonts: true,
          fontEmbedCSS: '',
          imagePlaceholder: transparentPlaceholder,
        });
      }
      const link = document.createElement("a");
      link.download = `hltv-profile-${player.nickname}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Failed to export profile PNG:", e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveProfileEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPts = Number(editValRating) || 0;
    const updatedData = {
      ...player,
      nickname: editNickname.trim(),
      realName: editRealName.trim(),
      country: editCountry,
      age: Number(editAge),
      role: editRole,
      rating: Number(editRating),
      valRating: newPts,
      avatarUrl: editAvatarUrl.trim(),
      socials: {
        twitter: editTwitter.trim(),
        instagram: editInstagram.trim(),
        faceit: editFaceit.trim(),
      },
    };

    // Save avatar to localStorage for instant persistence (only if not a massive base64 image)
    if (editAvatarUrl.trim() && !editAvatarUrl.startsWith('data:')) {
      safeLocalStorageSet(
        `player_avatar_${editNickname.trim().toLowerCase()}`,
        editAvatarUrl.trim(),
      );
    } else {
      localStorage.removeItem(`player_avatar_${editNickname.trim().toLowerCase()}`);
    }

    // 1. Instant update in localStorage
    const teamsToUpdateDocs: { id: string; players: any[]; totalValRating: number }[] = [];
    try {
      const localTeams = JSON.parse(
        localStorage.getItem(`teams_${uid}`) || "[]",
      );
      let teamChanged = false;
      const updatedTeams = localTeams.map((t: any) => {
        let pInTeam = false;
        const updatedPlayers = (t.players || []).map((tp: any) => {
          if (
            tp.id === player.id ||
            (tp.nickname &&
              tp.nickname.trim().toLowerCase() ===
                player.nickname?.trim().toLowerCase())
          ) {
            pInTeam = true;
            return {
              ...tp,
              nickname: editNickname.trim(),
              role: editRole,
              rating: Number(editRating),
              valRating: newPts,
              country: editCountry,
              avatarUrl: editAvatarUrl.trim(),
            };
          }
          return tp;
        });

        if (pInTeam) {
          teamChanged = true;
          const totalVal = updatedPlayers.slice(0, 5).reduce(
            (acc: number, p: any) => acc + (p?.valRating || 0),
            0,
          );
          if (t.id) {
            teamsToUpdateDocs.push({ id: t.id, players: updatedPlayers, totalValRating: totalVal });
          }
          return { ...t, players: updatedPlayers, totalValRating: totalVal };
        }
        return t;
      });

      if (teamChanged) {
        safeLocalStorageSet(`teams_${uid}`, updatedTeams);
      }

      const localPlayers = JSON.parse(
        localStorage.getItem(`players_${uid}`) || "[]",
      );
      const pIdx = localPlayers.findIndex(
        (p: any) =>
          (player.id && p.id === player.id) ||
          (p.nickname && player.nickname &&
            p.nickname.trim().toLowerCase() ===
              player.nickname.trim().toLowerCase()),
      );
      if (pIdx !== -1) {
        localPlayers[pIdx] = { ...localPlayers[pIdx], ...updatedData };
      } else {
        localPlayers.push(updatedData);
      }
      safeLocalStorageSet(`players_${uid}`, localPlayers);

      // Sync to server cache/db immediately so Firestore never reverts
      if (!user.isLocalDemo) {
        fetch('/api/sync-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid, players: localPlayers })
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Error updating player in storage:", err);
    }

    if (onUpdatePlayer) {
      onUpdatePlayer(updatedData);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);

    // 2. Non-blocking background sync to Firebase
    if (!user.isLocalDemo && player.id) {
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, "players", player.id), {
          nickname: updatedData.nickname,
          realName: updatedData.realName,
          country: updatedData.country,
          age: updatedData.age,
          role: updatedData.role,
          rating: updatedData.rating,
          valRating: updatedData.valRating,
          avatarUrl: updatedData.avatarUrl,
          socials: updatedData.socials,
        });

        for (const tDoc of teamsToUpdateDocs) {
          batch.update(doc(db, "teams", tDoc.id), {
            players: tDoc.players,
            totalValRating: tDoc.totalValRating,
          });
        }

        batch.commit().catch((err) => console.warn("Failed background update in Firebase:", err));
      } catch (err) {
        console.warn("Error queuing player profile update batch:", err);
      }
    }
  };

  const flagInfo =
    COUNTRY_NAMES[player.country || editCountry] || COUNTRY_NAMES.RU;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div
        ref={modalRef}
        className="bg-[#11121c] border border-white/10 rounded-2xl w-full max-w-4xl flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.8)] relative overflow-hidden my-auto text-white font-sans"
      >
        {/* Subtle top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-48 bg-gradient-to-b from-blue-600/15 via-purple-600/5 to-transparent pointer-events-none"></div>

        {/* TOP BAR / CLOSE BUTTON */}
        {!isExporting && (
          <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
            <button
              onClick={handleDownloadPng}
              disabled={isExporting}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#ff8f00]" />
              <span className="hidden sm:inline">Экспорт PNG</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* HERO HEADER (HLTV STYLE) */}
        <div className="p-6 sm:p-8 bg-[#161726] border-b border-white/10 relative z-10 flex flex-col md:flex-row gap-6 items-center md:items-start">
          {/* Player Photo Card */}
          <div className="relative group flex-shrink-0">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-[#0b0c13] border-2 border-white/10 overflow-hidden shadow-2xl relative flex items-center justify-center">
              <PlayerAvatar
                playerName={player.nickname}
                avatarUrl={editAvatarUrl || player.avatarUrl}
                sizeClassName="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
            </div>

            {/* Country Badge */}
            <div
              className="absolute -bottom-2 -right-2 bg-[#12131e] border border-white/20 rounded-lg px-2 py-0.5 text-xs font-mono font-bold text-white/90 shadow-lg flex items-center gap-1"
              title={flagInfo.name}
            >
              <Globe className="w-3 h-3 text-blue-400" />
              <span>{flagInfo.code}</span>
            </div>
          </div>

          {/* Player Info Main Column */}
          <div className="flex-1 text-center md:text-left flex flex-col justify-between h-full">
            <div>
              {/* Role badge + Team */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-md">
                  {player.role || "RIFLER"}
                </span>
                {playerStats.currentTeam ? (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/5 text-white/80 border border-white/10 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                    <TeamLogo
                      logoUrl={playerStats.currentTeam.logo}
                      teamName={playerStats.currentTeam.name}
                      sizeClassName="w-3.5 h-3.5"
                    />
                    {playerStats.currentTeam.name}
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-md">
                    FREE AGENT
                  </span>
                )}
                {player.isAcademy && (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-1 rounded-md">
                    ACADEMY
                  </span>
                )}
              </div>

              {/* Nickname */}
              <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight flex items-center justify-center md:justify-start gap-3">
                {player.nickname}
              </h1>

              {/* Real Name & Age */}
              <div className="text-sm text-white/50 font-medium mt-1 flex items-center justify-center md:justify-start gap-3">
                <span>
                  {player.realName ||
                    editRealName ||
                    `${player.nickname} Player`}
                </span>
                <span>•</span>
                <span>{player.age || editAge || 21} лет</span>
                <span>•</span>
                <span>{flagInfo.name}</span>
              </div>
            </div>

            {/* Info Quick Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/5 text-xs">
              <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-[10px] text-white/40 uppercase font-bold">
                    Команда
                  </div>
                  <div className="font-bold text-white truncate">
                    {playerStats.currentTeam?.name || "Без команды"}
                  </div>
                </div>
              </div>

              <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex items-center gap-2.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-[10px] text-white/40 uppercase font-bold">
                    Призовые
                  </div>
                  <div className="font-black text-emerald-400 font-mono">
                    ${playerStats.totalPrizeMoney.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex items-center gap-2.5 col-span-2 sm:col-span-1">
                <Award className="w-4 h-4 text-[#ff8f00]" />
                <div>
                  <div className="text-[10px] text-white/40 uppercase font-bold">
                    Награды HLTV
                  </div>
                  <div className="font-bold text-[#ff8f00]">
                    {playerStats.mvpCount}x MVP • {playerStats.evpCount}x EVP
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TROPHY & MEDAL SHELF ROW */}
        <div className="px-6 py-3 bg-[#11121c] border-b border-white/10 flex items-center gap-3 overflow-x-auto custom-scrollbar">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1 shrink-0">
            <Trophy className="w-3.5 h-3.5 text-[#ff8f00]" /> Трофеи:
          </span>
          {playerStats.trophyList.length === 0 ? (
            <span className="text-xs text-white/30 font-medium italic">
              Пока нет завоеванных медалей
            </span>
          ) : (
            playerStats.trophyList.map((tr, idx) => (
              <div
                key={idx}
                className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1.5 shrink-0 text-xs font-bold hover:border-[#ff8f00]/50 transition-colors"
                title={`${tr.title} (${tr.date})`}
              >
                {tr.type === "winner" && (
                  <Trophy className="w-3.5 h-3.5 text-[#ff8f00]" />
                )}
                {tr.type === "mvp" && (
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                )}
                {tr.type === "evp" && (
                  <Medal className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span className="text-white/90 text-[11px]">{tr.title}</span>
              </div>
            ))
          )}
        </div>

        {/* NAVIGATION TABS */}
        {!isExporting && (
          <div className="flex border-b border-white/10 bg-[#141522] overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setActiveTab("stats")}
              className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeTab === "stats"
                  ? "border-[#ff8f00] text-[#ff8f00] bg-white/5"
                  : "border-transparent text-white/50 hover:text-white"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              HLTV Rating 3.0
            </button>
            <button
              onClick={() => setActiveTab("matches")}
              className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeTab === "matches"
                  ? "border-[#ff8f00] text-[#ff8f00] bg-white/5"
                  : "border-transparent text-white/50 hover:text-white"
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              Матчи ({playerStats.matchesList.length})
            </button>
            <button
              onClick={() => setActiveTab("trophies")}
              className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeTab === "trophies"
                  ? "border-[#ff8f00] text-[#ff8f00] bg-white/5"
                  : "border-transparent text-white/50 hover:text-white"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Награды ({playerStats.trophyList.length})
            </button>
            {user?.isCustom && (
              <button
                onClick={() => setActiveTab("edit")}
                className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap cursor-pointer ml-auto flex items-center gap-2 ${
                  activeTab === "edit"
                    ? "border-blue-500 text-blue-400 bg-white/5"
                    : "border-transparent text-white/50 hover:text-white"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                Редактировать
              </button>
            )}
          </div>
        )}

        {/* TAB CONTENT BODY */}
        <div
          className={`p-6 bg-[#0f1019] ${isExporting ? "" : "overflow-y-auto max-h-[60vh] custom-scrollbar"}`}
        >
          {/* TAB 1: HLTV RATING 3.0 BREAKDOWN */}
          {(activeTab === "stats" || isExporting) && (
            <div className="flex flex-col gap-6">
              {/* TOP K/D CARD & RATING */}
              <div className="bg-[#161726] border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center">
                {/* K/D Circular Display */}
                <div className="flex flex-col items-center justify-center relative py-2">
                  <div className="w-36 h-36 rounded-full border-4 border-blue-500 bg-[#0c0d14] flex flex-col items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.25)] relative mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-0.5">
                      K/D RATIO
                    </span>
                    <span className="text-4xl font-black text-white font-mono">
                      {playerStats.kd.toFixed(2)}
                    </span>
                  </div>

                  {/* Rating below the circle */}
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#ff8f00] mb-0.5">
                      RATING 3.0
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-black text-white font-mono">
                        {playerStats.rating3.toFixed(2)}
                      </span>
                      <span
                        className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded border ${ratingLabel.bg} ${ratingLabel.color}`}
                      >
                        {ratingLabel.text}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CORE METRICS GRID (SCREENSHOT #2 HLTV GRID) */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#ff8f00]" /> Основные показатели
                  HLTV
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-[#161726] border border-white/5 rounded-xl p-3.5 flex flex-col">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-black text-white font-mono">
                        {Number(playerStats.roundSwing) > 0
                          ? `+${playerStats.roundSwing}%`
                          : `${playerStats.roundSwing}%`}
                      </span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        GOOD
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-white/40 uppercase">
                      ROUND SWING
                    </span>
                    <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(20, 50 + Number(playerStats.roundSwing) * 3))}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-[#161726] border border-white/5 rounded-xl p-3.5 flex flex-col">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-black text-white font-mono">
                        {playerStats.dpr}
                      </span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        GOOD
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-white/40 uppercase">
                      DPR (Смертей за раунд)
                    </span>
                    <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (1 - Number(playerStats.dpr)) * 120)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-[#161726] border border-white/5 rounded-xl p-3.5 flex flex-col">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-black text-white font-mono">
                        {playerStats.kast}%
                      </span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        GOOD
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-white/40 uppercase">
                      KAST %
                    </span>
                    <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${playerStats.kast}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-[#161726] border border-white/5 rounded-xl p-3.5 flex flex-col">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-black text-white font-mono">
                        {playerStats.multikill}%
                      </span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        GOOD
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-white/40 uppercase">
                      MULTI-KILL %
                    </span>
                    <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, playerStats.multikill * 2.5)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-[#161726] border border-white/5 rounded-xl p-3.5 flex flex-col">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-black text-white font-mono">
                        {playerStats.adr.toFixed(1)}
                      </span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        GOOD
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-white/40 uppercase">
                      ADR (Урон за раунд)
                    </span>
                    <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (playerStats.adr / 120) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-[#161726] border border-white/5 rounded-xl p-3.5 flex flex-col">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-black text-white font-mono">
                        {playerStats.kpr}
                      </span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        GOOD
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-white/40 uppercase">
                      KPR (Убийств за раунд)
                    </span>
                    <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Number(playerStats.kpr) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div 
                    className="bg-[#161726] border border-white/5 rounded-xl p-3.5 flex flex-col cursor-help"
                    title="Коэффициент стабильности рассчитывается на основе вариации перформанса в прошлых матчах. Чем он выше, тем меньше случайный разброс игрока в симуляциях."
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-black text-white font-mono">
                        {playerStats.consistency}%
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          playerStats.consistency >= 85
                            ? "text-emerald-400 bg-emerald-500/10"
                            : playerStats.consistency >= 70
                              ? "text-sky-400 bg-sky-500/10"
                              : playerStats.consistency >= 50
                                ? "text-amber-400 bg-amber-500/10"
                                : "text-rose-400 bg-rose-500/10"
                        }`}
                      >
                        {playerStats.consistency >= 85
                          ? "SUPERB"
                          : playerStats.consistency >= 70
                            ? "GOOD"
                            : playerStats.consistency >= 50
                              ? "AVG"
                              : "UNSTABLE"}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-white/40 uppercase">
                      СТАБИЛЬНОСТЬ %
                    </span>
                    <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          playerStats.consistency >= 85
                            ? "bg-emerald-500"
                            : playerStats.consistency >= 70
                              ? "bg-sky-500"
                              : playerStats.consistency >= 50
                                ? "bg-amber-500"
                                : "bg-rose-500"
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(10, playerStats.consistency))}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MATCHES HISTORY */}
          {(activeTab === "matches" || isExporting) && (
            <div className="flex flex-col gap-3">
              {isExporting && (
                <div className="text-xl font-black text-white mt-8 mb-4 border-b border-white/10 pb-2">
                  История Матчей
                </div>
              )}
              {playerStats.matchesList.length === 0 ? (
                <div className="text-center p-12 text-white/30 font-bold uppercase tracking-wider bg-[#161726] rounded-2xl border border-white/5">
                  Этот игрок еще не провел ни одного официального матча.
                </div>
              ) : (
                playerStats.matchesList.map((m) => (
                  <div
                    key={m.id}
                    className="bg-[#161726] border border-white/5 hover:border-white/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider ${m.won ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}
                      >
                        {m.won ? "WIN" : "LOSS"}
                      </div>
                      <div className="flex items-center gap-2">
                        <TeamLogo
                          logoUrl={m.enemyTeamLogo}
                          teamName={m.enemyTeamName}
                          sizeClassName="w-6 h-6"
                        />
                        <span className="font-bold text-white text-sm">
                          vs {m.enemyTeamName}
                        </span>
                      </div>
                      <span className="text-xs text-white/40 font-mono">
                        ({m.score})
                      </span>
                    </div>

                    <div className="flex items-center gap-6 text-xs font-bold">
                      <div className="text-white/60">
                        K-D:{" "}
                        <span className="text-white font-mono">
                          {m.kills}-{m.deaths}
                        </span>
                      </div>
                      <div className="text-white/60">
                        ADR:{" "}
                        <span className="text-white font-mono">{m.adr}</span>
                      </div>
                      <div className="text-[#ff8f00]">
                        Rating:{" "}
                        <span className="font-mono text-sm">{m.rating}</span>
                      </div>
                      <span className="text-[10px] text-white/30 uppercase tracking-wider">
                        {m.tourneyName}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: TROPHIES GALLERY */}
          {(activeTab === "trophies" || isExporting) && (
            <div className="flex flex-col gap-4">
              {isExporting && (
                <div className="text-xl font-black text-white mt-8 mb-2 border-b border-white/10 pb-2">
                  Галерея Трофеев
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {playerStats.trophyList.length === 0 ? (
                  <div className="col-span-full text-center p-12 text-white/30 font-bold uppercase tracking-wider bg-[#161726] rounded-2xl border border-white/5">
                    У игрока пока нет официальных кубков или медалей MVP/EVP.
                  </div>
                ) : (
                  playerStats.trophyList.map((tr, idx) => (
                    <div
                      key={idx}
                      className="bg-[#161726] border border-[#ff8f00]/30 rounded-2xl p-5 flex flex-col items-center text-center relative overflow-hidden group"
                    >
                      <div className="mb-2 group-hover:scale-110 transition-transform">
                        {tr.type === "winner" && (
                          <Trophy className="w-10 h-10 text-[#ff8f00]" />
                        )}
                        {tr.type === "mvp" && (
                          <Star className="w-10 h-10 text-amber-400" />
                        )}
                        {tr.type === "evp" && (
                          <Medal className="w-10 h-10 text-blue-400" />
                        )}
                      </div>
                      <div className="font-black text-white text-sm uppercase tracking-wide">
                        {tr.title}
                      </div>
                      <div className="text-[10px] text-white/40 mt-1">
                        {tr.date}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: EDIT PROFILE */}
          {activeTab === "edit" && user?.isCustom && !isExporting && (
            <form
              onSubmit={handleSaveProfileEdit}
              className="bg-[#161726] border border-white/10 rounded-2xl p-6 flex flex-col gap-4"
            >
              {saveSuccess && (
                <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4" /> Профиль игрока успешно обновлен!
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white/50 uppercase block mb-1">
                    Никнейм
                  </label>
                  <input
                    type="text"
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/50 uppercase block mb-1">
                    Настоящее имя
                  </label>
                  <input
                    type="text"
                    value={editRealName}
                    onChange={(e) => setEditRealName(e.target.value)}
                    placeholder="Напр. Kirill Mikhailov"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/50 uppercase block mb-1">
                    Страна
                  </label>
                  <select
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {Object.entries(COUNTRY_NAMES).map(([code, info]) => (
                      <option key={code} value={code}>
                        [{info.code}] {info.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/50 uppercase block mb-1">
                    Возраст
                  </label>
                  <input
                    type="number"
                    min="14"
                    max="50"
                    value={editAge}
                    onChange={(e) => setEditAge(Number(e.target.value))}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/50 uppercase block mb-1">
                    Роль в игре
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="rifler">Rifler / Рифлер</option>
                    <option value="sniper">Sniper / Снайпер</option>
                    <option value="lurker">Lurker / Люркер</option>
                    <option value="opener">Entry / Опенер</option>
                    <option value="support">Support / Саппорт</option>
                    <option value="captain">IGL / Капитан</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-amber-400 uppercase block mb-1">
                    VAC Pts (Для топа HLTV)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editValRating}
                    onChange={(e) =>
                      setEditValRating(Number(e.target.value) || 0)
                    }
                    className="w-full bg-black/50 border border-amber-500/30 rounded-xl px-4 py-2.5 text-amber-300 font-mono text-sm font-bold focus:border-amber-400 focus:outline-none"
                    title="Влияет только на позицию в рейтинге ТОП 20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-blue-400 uppercase block mb-1">
                    Игровой Рейтинг (50-200)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="200"
                    value={editRating}
                    onChange={(e) => setEditRating(Number(e.target.value) || 0)}
                    className="w-full bg-black/50 border border-blue-500/30 rounded-xl px-4 py-2.5 text-blue-300 font-mono text-sm font-bold focus:border-blue-400 focus:outline-none"
                    title="Влияет на результаты в симуляторе матчей"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/50 uppercase block mb-1">
                    Ссылка на фото / Аватар (URL)
                  </label>
                  <input
                    type="url"
                    value={editAvatarUrl}
                    onChange={(e) => setEditAvatarUrl(e.target.value)}
                    placeholder="https://i.imgur.com/example.png"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-2 pt-4 border-t border-white/10 flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl transition-colors text-xs uppercase tracking-wider cursor-pointer"
                >
                  Сохранить Изменения
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
