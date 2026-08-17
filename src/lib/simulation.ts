import { getPlayerPerks } from "./playerPerks";

export interface RoleSubclass {
    id: string;
    name: string;
    desc: string;
    icon: string;
    killMultBonus?: number;
    impactBonus?: number;
    deathMultBonus?: number;
    assistMultBonus?: number;
    firstKillBonus?: number;
    clutchBonus?: number;
    synergyBonus?: number;
    defenseBonus?: number;
}

export const ROLE_SUBCLASSES: Record<string, RoleSubclass[]> = {
    sniper: [
        { id: 'classic_awp', name: 'Снайпер классический', desc: 'Стабильные фраги с первой линии, минимальный риск', icon: '🎯', killMultBonus: 0.05, deathMultBonus: -0.05 },
        { id: 'support_awp', name: 'Снайпер саппорт', desc: 'Контроль длинных дистанций и помощь раскидками', icon: '🛡️', assistMultBonus: 0.25, deathMultBonus: -0.04 },
        { id: 'aggressive_awp', name: 'Агрессивный снайпер', desc: 'Первые опен-киллы и дуэли в начале раунда', icon: '🔥', firstKillBonus: 0.30, impactBonus: 0.12 },
        { id: 'secondary_awp', name: 'Второстепенный снайпер', desc: 'Гибридный игрок, играющий с рифлами на экономе', icon: '🔄', killMultBonus: 0.03, assistMultBonus: 0.12 }
    ],
    captain: [
        { id: 'classic_igl', name: 'Капитан', desc: 'Повышает дисциплину и синергию состава (+6 к синергии)', icon: '🧠', synergyBonus: 6, assistMultBonus: 0.15 },
        { id: 'fragging_igl', name: 'Стреляющий капитан', desc: 'Лично делает ключевые фрагменты в раундах (+12% к убийствам)', icon: '💥', killMultBonus: 0.12, impactBonus: 0.10 },
        { id: 'sniper_igl', name: 'Капитан снайпер', desc: 'Управляет картой с AWP в руках', icon: '🎯', killMultBonus: 0.08, impactBonus: 0.12 },
        { id: 'tactician_igl', name: 'Капитан-тактик', desc: 'Организует четкие размены и грамотные закупки', icon: '📋', assistMultBonus: 0.25, synergyBonus: 3 }
    ],
    support: [
        { id: 'anchor', name: 'Опорник', desc: 'Железное удержание позиций в обороне за CT', icon: '🔒', defenseBonus: 0.20, deathMultBonus: -0.08 },
        { id: 'utility_support', name: 'Саппорт', desc: 'Максимальный эффект от флешек и дымов (+40% ассистов)', icon: '💣', assistMultBonus: 0.40, impactBonus: 0.05 },
        { id: 'second_entry', name: 'Разменщик (2-я волна)', desc: 'Мгновенно разменивает открывающего игрока', icon: '⚡', killMultBonus: 0.10, impactBonus: 0.08 }
    ],
    rifler: [
        { id: 'classic_rifler', name: 'Классический рифлер', desc: 'Стабильная стрельба на любых дистанциях', icon: '🔫', killMultBonus: 0.06, deathMultBonus: -0.03 },
        { id: 'aggressive_entry', name: 'Агрессивный рифлер', desc: 'Вламывается на плент первыми фрагами', icon: '🔥', firstKillBonus: 0.30, impactBonus: 0.15 },
        { id: 'support_rifler', name: 'Рифлер саппорт', desc: 'Подстраховка позиции и помощь гранатами', icon: '🛡️', assistMultBonus: 0.20, deathMultBonus: -0.04 },
        { id: 'space_creator', name: 'Создатель пространства', desc: 'Растягивает оборону и отвлекает внимание', icon: '🌀', impactBonus: 0.18, firstKillBonus: 0.15 }
    ],
    opener: [
        { id: 'aggressive_entry', name: 'Агрессивный рифлер', desc: 'Вламывается на плент первыми фрагами', icon: '🔥', firstKillBonus: 0.30, impactBonus: 0.15 },
        { id: 'space_creator', name: 'Создатель пространства', desc: 'Растягивает оборону и отвлекает внимание', icon: '🌀', impactBonus: 0.18, firstKillBonus: 0.15 },
        { id: 'classic_rifler', name: 'Классический рифлер', desc: 'Стабильная стрельба на любых дистанциях', icon: '🔫', killMultBonus: 0.06, deathMultBonus: -0.03 },
        { id: 'support_rifler', name: 'Рифлер саппорт', desc: 'Подстраховка позиции и помощь гранатами', icon: '🛡️', assistMultBonus: 0.20, deathMultBonus: -0.04 }
    ],
    lurker: [
        { id: 'closer', name: 'Закрывающий', desc: 'Выигрывает раунды в меньшинстве 1v1, 1v2 (+35% к клатчам)', icon: '👑', clutchBonus: 0.35, impactBonus: 0.12 },
        { id: 'baiter_lurker', name: 'Люркер байтер', desc: 'Выживаемость и внезапные атаки со спины', icon: '🥷', deathMultBonus: -0.10, killMultBonus: 0.05 },
        { id: 'flanker', name: 'Агрессивный фланкер', desc: 'Быстрые заходы в тыл врага при перетяжках', icon: '⚡', firstKillBonus: 0.15, impactBonus: 0.15 }
    ]
};

export function getSubclassesForRole(roleId: string): RoleSubclass[] {
    const norm = normalizeRoleId(roleId);
    return ROLE_SUBCLASSES[norm] || ROLE_SUBCLASSES['rifler'] || [];
}

export function getSubclassObj(roleId: string, subclassId?: string): RoleSubclass | null {
    if (!subclassId || subclassId === 'none' || subclassId === 'default') return null;
    const list = getSubclassesForRole(roleId);
    return list.find(s => s.id === subclassId) || null;
}

export const DEFAULT_ROLES_S2 = [
    { id: 'rifler', name: 'Рифлер', killMultiplier: 1.12, skillMultiplier: 1.08, impact: 1.10, deathMultiplier: 0.98, assistMultiplier: 1.0 },
    { id: 'sniper', name: 'Снайпер', killMultiplier: 1.32, skillMultiplier: 1.22, impact: 1.35, deathMultiplier: 0.80, assistMultiplier: 0.7 },
    { id: 'lurker', name: 'Люркер', killMultiplier: 1.12, skillMultiplier: 1.08, impact: 1.12, deathMultiplier: 0.88, assistMultiplier: 0.9 },
    { id: 'opener', name: 'Опенер', killMultiplier: 1.24, skillMultiplier: 1.18, impact: 1.28, deathMultiplier: 1.08, assistMultiplier: 1.1 },
    { id: 'support', name: 'Саппорт', killMultiplier: 0.98, skillMultiplier: 1.02, impact: 1.00, deathMultiplier: 0.92, assistMultiplier: 1.45 },
    { id: 'captain', name: 'Капитан', killMultiplier: 0.96, skillMultiplier: 1.12, impact: 1.35, deathMultiplier: 0.95, assistMultiplier: 1.35 }
];

export const DEFAULT_ROLES_CS2 = [
    { id: 'rifler', name: 'Рифлер', killMultiplier: 1.12, skillMultiplier: 1.08, impact: 1.10, deathMultiplier: 0.98, assistMultiplier: 1.0 },
    { id: 'sniper', name: 'AWPer', killMultiplier: 1.32, skillMultiplier: 1.24, impact: 1.38, deathMultiplier: 0.80, assistMultiplier: 0.7 },
    { id: 'lurker', name: 'Люркер', killMultiplier: 1.12, skillMultiplier: 1.08, impact: 1.12, deathMultiplier: 0.88, assistMultiplier: 0.9 },
    { id: 'opener', name: 'Entry', killMultiplier: 1.25, skillMultiplier: 1.18, impact: 1.30, deathMultiplier: 1.08, assistMultiplier: 1.1 },
    { id: 'support', name: 'Саппорт', killMultiplier: 0.98, skillMultiplier: 1.02, impact: 1.00, deathMultiplier: 0.92, assistMultiplier: 1.45 },
    { id: 'captain', name: 'IGL', killMultiplier: 0.96, skillMultiplier: 1.12, impact: 1.35, deathMultiplier: 0.95, assistMultiplier: 1.35 }
];

export const MAP_POOL_CS2 = [
    { id: 'mirage', name: 'Mirage', tSideBias: 0.50, ctSideBias: 0.50 },
    { id: 'inferno', name: 'Inferno', tSideBias: 0.52, ctSideBias: 0.48 },
    { id: 'dust2', name: 'Dust2', tSideBias: 0.51, ctSideBias: 0.49 },
    { id: 'nuke', name: 'Nuke', tSideBias: 0.45, ctSideBias: 0.55 },
    { id: 'ancient', name: 'Ancient', tSideBias: 0.46, ctSideBias: 0.54 },
    { id: 'anubis', name: 'Anubis', tSideBias: 0.54, ctSideBias: 0.46 },
    { id: 'cache', name: 'Cache', tSideBias: 0.51, ctSideBias: 0.49 },
];

export const MAP_POOL_S2 = [
    { id: 'breeze', name: 'Breeze', tSideBias: 0.50, ctSideBias: 0.50 },
    { id: 'rust', name: 'Rust', tSideBias: 0.48, ctSideBias: 0.52 },
    { id: 'province', name: 'Province', tSideBias: 0.53, ctSideBias: 0.47 },
    { id: 'sandstone', name: 'Sandstone', tSideBias: 0.50, ctSideBias: 0.50 },
    { id: 'dune', name: 'Dune', tSideBias: 0.51, ctSideBias: 0.49 },
    { id: 'sakura', name: 'Sakura', tSideBias: 0.46, ctSideBias: 0.54 },
    { id: 'prison', name: 'Prison', tSideBias: 0.49, ctSideBias: 0.51 },
];

const CS2_WEAPONS = {
    pistols: [
        { id: 'usp', name: 'USP-S', price: 0 },
        { id: 'glock', name: 'Glock-18', price: 0 },
        { id: 'p2000', name: 'P2000', price: 0 },
        { id: 'p250', name: 'P250', price: 300 },
        { id: 'fiveSeven', name: 'Five-SeveN', price: 500 },
        { id: 'tec9', name: 'Tec-9', price: 500 },
        { id: 'deagle', name: 'Desert Eagle', price: 700 }
    ],
    smgs: [
        { id: 'mac10', name: 'MAC-10', price: 1050 },
        { id: 'mp9', name: 'MP9', price: 1250 },
        { id: 'mp5sd', name: 'MP5-SD', price: 1500 },
        { id: 'ump45', name: 'UMP-45', price: 1200 }
    ],
    shotguns: [
        { id: 'nova', name: 'Nova', price: 1100 },
        { id: 'xm1014', name: 'XM1014', price: 2000 }
    ],
    rifles: [
        { id: 'galil', name: 'Galil AR', price: 1800 },
        { id: 'famas', name: 'FAMAS', price: 2050 },
        { id: 'ak47', name: 'AK-47', price: 2700 },
        { id: 'm4a4', name: 'M4A4', price: 3100 },
        { id: 'm4a1s', name: 'M4A1-S', price: 2900 }
    ],
    snipers: [
        { id: 'ssg08', name: 'SSG 08', price: 1700 },
        { id: 'awp', name: 'AWP', price: 4750 }
    ],
    gear: [
        { id: 'kevlar', name: 'Kevlar', price: 650 },
        { id: 'helmet', name: 'Kevlar+Helmet', price: 1000 },
        { id: 'flash', name: 'Flashbang', price: 200 },
        { id: 'smoke', name: 'Smoke Grenade', price: 300 },
        { id: 'he', name: 'HE Grenade', price: 300 },
        { id: 'molotov', name: 'Molotov/Incendiary', price: 400 }
    ]
};

const SITUATION_REWARDS = { win: 3000, winDefuse: 3200, lose: 1900, lose2: 2400, lose3: 2900, plant: 600, defuse: 300, loseBomb: 300 };
const CS2_SITUATION_REWARDS = { win:3250, winDefuse:3500, lose:1400, lose2:1900, lose3:2400, lose4:2900, plant:800, defuse:300, loseBomb:300 };

export function normalizeRating(r: number) {
    if (r === null || r === undefined || isNaN(r)) return 50;
    if (r < 2) {
        return Math.max(0, Math.min(5000, r * 100));
    }
    return Math.max(0, Math.min(5000, r));
}

let activeCustomRoles: any[] | null = null;

// Индивидуальные настройки для конкретных игроков по их никнеймам подгружаются из playerPerks.ts.
export function getPlayerModifier(nickname?: string) {
    if (!nickname) return null;
    return getPlayerPerks(nickname);
}

export function setSimulationRoles(roles: any[] | null) {
    activeCustomRoles = roles;
}

export function normalizeRoleId(roleId: string | undefined): string {
    if (!roleId) return 'rifler';
    const r = roleId.toLowerCase().trim();
    if (r === 'sniper' || r === 'awper' || r === 'awp' || r === 'снайпер') return 'sniper';
    if (r === 'opener' || r === 'entry' || r === 'entryer' || r === 'опенер') return 'opener';
    if (r === 'captain' || r === 'igl' || r === 'капитан') return 'captain';
    if (r === 'support' || r === 'саппорт') return 'support';
    if (r === 'lurker' || r === 'люркер') return 'lurker';
    return 'rifler';
}

function getRoleSkillMultiplier(roleId: string, isCS2: boolean, nickname?: string, subclassId?: string) {
    const roles = activeCustomRoles || (isCS2 ? DEFAULT_ROLES_CS2 : DEFAULT_ROLES_S2);
    const norm = normalizeRoleId(roleId);
    const role = roles.find(r => r.id === norm || r.id === roleId);
    let mult = role ? role.skillMultiplier : 1.0;
    const sub = getSubclassObj(roleId, subclassId);
    if (sub && sub.impactBonus) mult += sub.impactBonus;
    return mult;
}

function getRoleKillMultiplier(roleId: string, isCS2: boolean, nickname?: string, subclassId?: string) {
    const roles = activeCustomRoles || (isCS2 ? DEFAULT_ROLES_CS2 : DEFAULT_ROLES_S2);
    const norm = normalizeRoleId(roleId);
    const role = roles.find(r => r.id === norm || r.id === roleId);
    let mult = role ? role.killMultiplier : 1.0;
    const sub = getSubclassObj(roleId, subclassId);
    if (sub && sub.killMultBonus) mult += sub.killMultBonus;
    return mult;
}

function getRoleDeathMultiplier(roleId: string, isCS2: boolean, nickname?: string, subclassId?: string) {
    const roles = activeCustomRoles || (isCS2 ? DEFAULT_ROLES_CS2 : DEFAULT_ROLES_S2);
    const norm = normalizeRoleId(roleId);
    const role = roles.find(r => r.id === norm || r.id === roleId);
    let mult = role ? (role.deathMultiplier || 1.0) : 1.0;
    const sub = getSubclassObj(roleId, subclassId);
    if (sub && sub.deathMultBonus) mult += sub.deathMultBonus;
    return mult;
}

function getRoleAssistMultiplier(roleId: string, isCS2: boolean, nickname?: string, subclassId?: string) {
    const roles = activeCustomRoles || (isCS2 ? DEFAULT_ROLES_CS2 : DEFAULT_ROLES_S2);
    const norm = normalizeRoleId(roleId);
    const role = roles.find(r => r.id === norm || r.id === roleId);
    let mult = role ? (role.assistMultiplier || 1.0) : 1.0;
    const sub = getSubclassObj(roleId, subclassId);
    if (sub && sub.assistMultBonus) mult += sub.assistMultBonus;
    return mult;
}

export function calculateConsistencyFromMatchHistory(ratings: number[], baseRating: number = 100): number {
    if (!ratings || ratings.length === 0) return 0;
    
    // Normalize ratings to standard HLTV ~1.0 scale
    const normalized = ratings.map(r => {
        let val = Number(r);
        if (isNaN(val) || val <= 0) return 1.0;
        return val > 10 ? val / 100 : val;
    });

    const n = normalized.length;
    const sum = normalized.reduce((acc, v) => acc + v, 0);
    const mean = sum / n;
    
    // Standard deviation from player's mean rating across past matches
    const variance = normalized.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    // Coefficient of variation (CV = stdDev / mean)
    const cv = mean > 0 ? (stdDev / mean) : 0.2;
    
    // Lower CV (e.g. 0.05) -> high consistency (~95%)
    // Higher CV (e.g. 0.35) -> low consistency (~25%)
    const historicalConsistency = Math.max(20, Math.min(99, Math.round(100 - (cv * 200))));

    // Blend with player's base skill rating depending on match history sample size
    const baseNorm = baseRating > 10 ? baseRating / 100 : baseRating;
    const baseConsistency = Math.max(30, Math.min(95, Math.round(65 + (baseNorm - 1.0) * 100)));

    const weight = Math.min(1.0, n / 5);
    return Math.round(historicalConsistency * weight + baseConsistency * (1 - weight));
}

export function getPlayerStability(player: any, matchAvg?: number): number {
    if (!player) return 75;
    
    // 1. Explicit manually set or pre-calculated consistency
    if (player.consistency !== undefined && player.consistency !== null && !isNaN(Number(player.consistency))) {
        return Math.max(20, Math.min(100, Number(player.consistency)));
    }
    
    // 2. Derive from player's match history if available
    let ratings: number[] = [];
    if (Array.isArray(player.matchesList) && player.matchesList.length > 0) {
        ratings = player.matchesList.map((m: any) => parseFloat(m.rating)).filter((r: number) => !isNaN(r) && r > 0);
    } else if (Array.isArray(player.matchHistory) && player.matchHistory.length > 0) {
        ratings = player.matchHistory.map((m: any) => parseFloat(m.rating || m.hltvRating)).filter((r: number) => !isNaN(r) && r > 0);
    } else if (Array.isArray(player.recentRatings) && player.recentRatings.length > 0) {
        ratings = player.recentRatings.map((r: any) => parseFloat(r)).filter((r: number) => !isNaN(r) && r > 0);
    } else if (Array.isArray(player.ratingsHistory) && player.ratingsHistory.length > 0) {
        ratings = player.ratingsHistory.map((r: any) => parseFloat(r)).filter((r: number) => !isNaN(r) && r > 0);
    }

    let rawR = parseFloat(player.rating || player.hltvRating) || 100;
    if (ratings.length > 0) {
        return calculateConsistencyFromMatchHistory(ratings, rawR);
    }
    
    // 3. Fallback relative to match room level if no match history
    if (rawR < 10) rawR = rawR * 100; // normalize e.g. 1.25 -> 125
    
    let relRatio = 1.0;
    if (matchAvg && matchAvg > 0) {
        let normAvg = matchAvg < 10 ? matchAvg * 100 : matchAvg;
        relRatio = rawR / normAvg;
    } else {
        relRatio = rawR / 100;
    }
    
    // Relative ratio: 1.0 = avg stability ~ 70%. 1.2x (star) = ~95% stability.
    const calculated = 70 + (relRatio - 1.0) * 125;
    return Math.round(Math.max(25, Math.min(99, calculated)));
}

function calculateTeamStrength(team: any[], isCS2: boolean, teamplay: number = 50, form: number = 0, matchAvgRating?: number) {
    let totalRatingStrength = 0;
    let iglTacticalBonus = 1.0;
    const avg = (matchAvgRating && matchAvgRating > 0) ? (matchAvgRating < 10 ? matchAvgRating * 100 : matchAvgRating) : 100;

    team.forEach(player => {
        let rawR = (parseFloat(player.rating) || 100) + form;
        if (rawR < 10) rawR = rawR * 100;
        const relR = rawR / avg;
        const normRole = normalizeRoleId(player.role);
        const stability = getPlayerStability(player, avg) / 100;
        
        let playerStrength = Math.pow(relR, 1.55) * 100 * getRoleSkillMultiplier(normRole, isCS2, player.nickname, player.subclass);
        
        const sub = getSubclassObj(player.role, player.subclass);
        if (normRole === 'captain') {
            const callQuality = (relR - 1.0) / 8; 
            iglTacticalBonus += Math.max(-0.08, callQuality);
            if (sub && sub.synergyBonus) {
                iglTacticalBonus += (sub.synergyBonus / 100);
            }
        }
        
        const noise = (1.0 - stability) * 0.06;
        // Shift expected value lower so unstable players drag the team down slightly more on average
        playerStrength *= (1.0 - (noise * 0.65) + Math.random() * noise);
        totalRatingStrength += playerStrength;
    });
    
    const teamplayBonus = 0.92 + (teamplay / 100) * 0.16;
    return totalRatingStrength * teamplayBonus * iglTacticalBonus;
}

function computeRoundWinChance(
    team1Strength: number, team2Strength: number, 
    t1Eco: any, t2Eco: any, 
    t1Momentum: number, t2Momentum: number,
    team1Tactic: string, team2Tactic: string,
    isT1Tside: boolean,
    mapName: string,
    isCS2: boolean,
    team1MapExp: number = 50,
    team2MapExp: number = 50
) {
    let t1Mod = 0;
    let t2Mod = 0;
    let executionBonus = 0;

    // Advanced tactics influence (Rush, Split, Default execution based on tactics)
    const t1TacticEff = isT1Tside ? team1Tactic : team2Tactic; // T tactic
    const ctTacticEff = isT1Tside ? team2Tactic : team1Tactic; // CT tactic
    
    const t1Buy = t1Eco.power;
    const t2Buy = t2Eco.power;

    if (team1Tactic === 'aggressive') {
        t1Mod += isT1Tside ? 0.06 : -0.01; 
        if (t1Momentum > 0) t1Mod += 0.04; 
        if (t1Buy < 0.8) t1Mod += 0.03; // Forces with aggressive works well
    } else if (team1Tactic === 'defensive') {
        t1Mod += !isT1Tside ? 0.06 : -0.01; 
        if (t2Momentum > 0) t1Mod += 0.03; 
    } else if (team1Tactic === 'fake') {
        t1Mod += isT1Tside ? 0.07 : -0.03; // Fakes are powerful on T, bad on CT
        if (ctTacticEff === 'aggressive') t1Mod += 0.04; // Fake vs Aggressive CT is very good
    }

    if (team2Tactic === 'aggressive') {
        t2Mod += !isT1Tside ? 0.06 : -0.01;
        if (t2Momentum > 0) t2Mod += 0.04;
        if (t2Buy < 0.8) t2Mod += 0.03;
    } else if (team2Tactic === 'defensive') {
        t2Mod += isT1Tside ? 0.06 : -0.01;
        if (t1Momentum > 0) t2Mod += 0.03;
    } else if (team2Tactic === 'fake') {
        t2Mod += !isT1Tside ? 0.07 : -0.03;
        if (t1TacticEff === 'aggressive') t2Mod += 0.04;
    }

    const totalStrength = team1Strength + team2Strength;
    const diff = ((team1Strength * (1 + t1Mod)) - (team2Strength * (1 + t2Mod))) / (totalStrength || 1);
    const clampedDiff = Math.max(-0.40, Math.min(0.40, diff * 3.0));
    
    const buyDiff = (t1Buy - t2Buy) * 0.08;
    const momDiff = (t1Momentum - t2Momentum) * 0.02;

    // Apply map bias
    const mapPool = isCS2 ? MAP_POOL_CS2 : MAP_POOL_S2;
    const mapInfo = mapPool.find(m => m.name === mapName);
    const tBias = mapInfo ? mapInfo.tSideBias : 0.5;
    const ctBias = mapInfo ? mapInfo.ctSideBias : 0.5;

    let mapBiasEdge = 0;
    if (isT1Tside) {
        mapBiasEdge = tBias - 0.5;
    } else {
        mapBiasEdge = ctBias - 0.5;
    }
    
    const expEdge = (team1MapExp - team2MapExp) * 0.0015;

    const edge = clampedDiff + buyDiff + momDiff + mapBiasEdge + expEdge;
    const chance = Math.max(0.15, Math.min(0.85, 0.5 + edge));
    const roundNoise = (Math.random() - 0.5) * 0.20;
    
    return Math.max(0.05, Math.min(0.95, chance + roundNoise));
}

function shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function getEconomy(
    teamMoney: number, 
    momentum: number, 
    isPistolRound: boolean, 
    isCS2: boolean, 
    isTside: boolean = false,
    isSecondRound: boolean = false,
    isPistolWinner: boolean = false
) {
    let equipment: string[] = [];
    
    const pistolsT = ['Glock-18', 'P250', 'Tec-9', 'Desert Eagle'];
    const pistolsCT = ['USP-S', 'P2000', 'P250', 'Five-SeveN', 'Desert Eagle'];
    const smgsT = ['MAC-10', 'UMP-45', 'MP5-SD'];
    const smgsCT = ['MP9', 'UMP-45', 'MP5-SD'];
    const shotguns = ['Nova', 'XM1014'];
    const riflesT = ['AK-47', 'Galil AR', 'SG 553'];
    const riflesCT = ['M4A4', 'M4A1-S', 'FAMAS', 'AUG'];
    const snipers = ['SSG 08', 'AWP'];
    
    const pistol = isTside ? pistolsT[Math.floor(Math.random() * pistolsT.length)] : pistolsCT[Math.floor(Math.random() * pistolsCT.length)];
    const rifle = isTside ? riflesT[Math.floor(Math.random() * riflesT.length)] : riflesCT[Math.floor(Math.random() * riflesCT.length)];
    const cheapRifle = isTside ? 'Galil AR' : 'FAMAS';
    const smg = isTside ? smgsT[Math.floor(Math.random() * smgsT.length)] : smgsCT[Math.floor(Math.random() * smgsCT.length)];
    const shotgun = shotguns[Math.floor(Math.random() * shotguns.length)];
    const sniper = snipers[Math.floor(Math.random() * snipers.length)];
    const upgradedPistol = 'P250';
    
    if (isPistolRound) {
        equipment = [
            `Kevlar/${upgradedPistol}`, 
            `Kevlar/${pistol}`, 
            `Kevlar/${pistol}`, 
            `Kevlar/${pistol}`, 
            `${pistol}/Smoke`
        ];
        return { power: 0.90, cost: 4000, type: 'Pistol', hasAWP: false, equipment };
    }

    if (isSecondRound) {
        if (isPistolWinner) {
            // Anti-Eco Buy for pistol winner (armor, cheap rifles/SMGs)
            const type = 'Anti-Eco Buy';
            const power = 0.94; 
            const cost = isCS2 ? 3000 * 5 : 2500 * 5;
            equipment = [
                `${rifle}/Kevlar`,
                `${smg}/Kevlar`,
                `${shotgun}/Kevlar`,
                `${upgradedPistol}/Kevlar`,
                `${pistol}/Kevlar`
            ];
            return { power, cost, type, hasAWP: false, equipment };
        } else {
            // Pistol loser ALWAYS ecos, unless T planted the bomb and decides to force buy
            const canForce = isTside && teamMoney >= 9000;
            if (canForce && Math.random() < 0.85) {
                const type = 'Force Buy';
                const power = 0.88;
                const cost = teamMoney;
                equipment = [
                    `${rifle}/Kevlar`,
                    `${smg}/Kevlar`,
                    `${shotgun}/Kevlar`,
                    `${upgradedPistol}/Kevlar`,
                    `${pistol}/Flash`
                ];
                return { power, cost, type, hasAWP: false, equipment };
            } else {
                const type = 'Eco';
                const power = 0.72;
                const cost = 0;
                equipment = [
                    `${upgradedPistol}/Flash`,
                    `${upgradedPistol}/Smoke`,
                    `${pistol}/Flash`,
                    `${pistol}/Smoke`,
                    `${pistol}/Flash`
                ];
                return { power, cost, type, hasAWP: false, equipment };
            }
        }
    }
    
    const avgMoney = teamMoney / 5;
    const full = isCS2 ? 4500 : 3500;
    const half = isCS2 ? 3000 : 2500;
    const awpCost = isCS2 ? 4750 : 4750;
    
    let type = 'Eco';
    let power = 0.76;
    let cost = 800 * 5;
    let hasAWP = false;
    
    if (avgMoney >= full) {
        type = 'Full Buy';
        power = 1.0;
        cost = 4500 * 5;
        if (teamMoney >= cost + awpCost - 3000 && Math.random() < 0.85) {
            hasAWP = true;
            cost += 1750;
            equipment = ['AWP', rifle, rifle, rifle, rifle];
        } else {
            equipment = [rifle, rifle, rifle, rifle, rifle];
        }
    } else if (avgMoney >= half) {
        type = 'Half Buy';
        power = 0.9;
        cost = 3000 * 5;
        if (teamMoney >= cost + awpCost - 2000 && Math.random() < 0.4) {
            hasAWP = true;
            cost += 2750;
            equipment = ['AWP', cheapRifle, smg, upgradedPistol, pistol];
        } else {
            equipment = [cheapRifle, cheapRifle, smg, smg, upgradedPistol];
        }
    } else if (avgMoney >= 1500) {
        if (momentum > 0 || Math.random() < 0.6) {
            type = 'Force Buy';
            power = 0.85;
            cost = teamMoney;
            equipment = ['Desert Eagle', 'Desert Eagle', smg, smg, upgradedPistol];
        } else {
            type = 'Eco';
            power = 0.76;
            cost = 0;
            equipment = [upgradedPistol, upgradedPistol, pistol, pistol, pistol];
        }
    } else {
        type = 'Eco';
        power = 0.76;
        cost = 0;
        equipment = [upgradedPistol, pistol, pistol, pistol, pistol];
    }
    
    equipment = shuffle(equipment);
    
    return { power, cost, type, hasAWP, equipment };
}

function getLossBonus(streak: number, rewards: any) {
    if (streak >= 4 && rewards.lose4) return rewards.lose4;
    if (streak >= 3) return rewards.lose3;
    if (streak === 2) return rewards.lose2;
    return rewards.lose;
}


function getWeightedVictims(teamStats: any[], teamData: any[], count: number, isCS2: boolean, matchAvgRating?: number): number[] {
    const indices = Array.from({ length: teamStats.length }, (_, i) => i);
    const victims: number[] = [];
    const avg = (matchAvgRating && matchAvgRating > 0) ? (matchAvgRating < 10 ? matchAvgRating * 100 : matchAvgRating) : 100;
    
    // Calculate death weights for each player relative to match average
    const weights = teamStats.map((stat, i) => {
        const player = teamData[i];
        let rVal = parseFloat(player?.rating) || 100;
        if (rVal < 10) rVal = rVal * 100;
        
        const relR = rVal / avg;
        let w = Math.pow(1.0 / Math.max(0.2, relR), 1.25);
        
        // Use the defined death multiplier for each role
        const dm = getRoleDeathMultiplier(player?.role, isCS2, player?.nickname, player?.subclass);
        w *= dm;
        
        return w;
    });

    // Select 'count' unique victims using weighted random selection without replacement
    for (let c = 0; c < count; c++) {
        let totalWeight = 0;
        const currentWeights = indices.map(idx => (victims.includes(idx) ? 0 : weights[idx]));
        currentWeights.forEach(wt => totalWeight += wt);
        
        if (totalWeight <= 0) {
            const remaining = indices.filter(idx => !victims.includes(idx));
            if (remaining.length > 0) {
                const picked = remaining[Math.floor(Math.random() * remaining.length)];
                victims.push(picked);
            }
            continue;
        }
        
        let r = Math.random() * totalWeight;
        let pickedIdx = -1;
        for (let i = 0; i < indices.length; i++) {
            const idx = indices[i];
            if (victims.includes(idx)) continue;
            r -= weights[idx];
            if (r <= 0) {
                pickedIdx = idx;
                break;
            }
        }
        if (pickedIdx === -1) {
            const remaining = indices.filter(idx => !victims.includes(idx));
            pickedIdx = remaining[0];
        }
        victims.push(pickedIdx);
    }
    
    return victims;
}

function getWeightedRandomIndex(stats: any[], teamData: any[], isCS2: boolean, roundKills?: Map<string, number>, matchAvgRating?: number) {
    let totalWeight = 0;
    const weights = [];
    const avg = (matchAvgRating && matchAvgRating > 0) ? (matchAvgRating < 10 ? matchAvgRating * 100 : matchAvgRating) : 100;

    for (let i = 0; i < teamData.length; i++) {
        let rVal = (parseFloat(teamData[i]?.rating) || 100);
        if (rVal < 10) rVal = rVal * 100;
        
        const relR = rVal / avg;
        
        // Exponent 1.75 on relative rating ensures top-tier star players in any room scale top-frag
        let w = Math.pow(relR, 1.75);
        
        // Use the defined kill multiplier for each role
        const km = getRoleKillMultiplier(teamData[i]?.role, isCS2, teamData[i]?.nickname, teamData[i]?.subclass);
        w = w * km;
        
        if (roundKills) {
            const nickname = teamData[i]?.nickname || stats[i]?.nickname;
            if (nickname) {
                const killsInRound = roundKills.get(nickname) || 0;
                if (killsInRound > 0) {
                    w = w * Math.pow(0.70, killsInRound);
                }
            }
        }
        
        const stab = getPlayerStability(teamData[i], avg) / 100;
        const noise = 0.20 * (1.2 - stab * 0.5);
        // Penalty on average for being unstable, while retaining pop-off potential
        w = w * (1.0 - (noise * 0.65) + Math.random() * noise);
        weights.push(w);
        totalWeight += w;
    }
    let r = Math.random() * totalWeight;
    for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) return i;
    }
    return teamData.length - 1;
}

function getWeightedAssist(teamStats: any[], teamData: any[], kIdx: number, isCS2: boolean): number {
    const weights = teamStats.map((stat, i) => {
        if (i === kIdx) return 0; // Killer cannot assist themselves
        const player = teamData[i];
        let w = 1.0;
        
        const am = getRoleAssistMultiplier(player?.role, isCS2, player?.nickname, player?.subclass);
        w *= am;
        
        w *= (0.8 + Math.random() * 0.4);
        return w;
    });
    
    let totalWeight = 0;
    weights.forEach(w => totalWeight += w);
    
    if (totalWeight <= 0) return (kIdx + 1) % teamStats.length;
    
    let r = Math.random() * totalWeight;
    for (let i = 0; i < weights.length; i++) {
        if (weights[i] === 0) continue;
        if (r < weights[i]) return i;
        r -= weights[i];
    }
    return (kIdx + 1) % teamStats.length;
}

function distributeKills(winnerKills: number, loserKills: number, winStats: any[], loseStats: any[], winTeamData: any[], loseTeamData: any[], isCS2: boolean, currentRound: number, matchAvgRating?: number) {
    const roundKills = new Map<string, number>();
    
    const actualWinnerKills = Math.min(winnerKills, loseStats.length);
    const actualLoserKills = Math.min(loserKills, winStats.length);
    
    let loseVictims = getWeightedVictims(loseStats, loseTeamData, actualWinnerKills, isCS2, matchAvgRating);
    let winVictims = getWeightedVictims(winStats, winTeamData, actualLoserKills, isCS2, matchAvgRating);

    // Distribution of non-lethal damage to random players
    for (let i = 0; i < winStats.length; i++) {
        if (Math.random() < 0.15) winStats[i].damage += Math.floor(Math.random() * 25);
    }
    for (let i = 0; i < loseStats.length; i++) {
        if (Math.random() < 0.15) loseStats[i].damage += Math.floor(Math.random() * 25);
    }

    for (let i = 0; i < actualWinnerKills; i++) {
        if (winStats.length === 0) continue;
        const kIdx = getWeightedRandomIndex(winStats, winTeamData, isCS2, roundKills, matchAvgRating);
        winStats[kIdx].kills++;
        winStats[kIdx].damage += 85 + Math.floor(Math.random() * 15);
        roundKills.set(winStats[kIdx].nickname, (roundKills.get(winStats[kIdx].nickname) || 0) + 1);
        
        if (i < loseVictims.length) {
            const vIdx = loseVictims[i];
            loseStats[vIdx].deaths++;
        }
        
        if (Math.random() < 0.20) {
            let aIdx = getWeightedAssist(winStats, winTeamData, kIdx, isCS2);
            winStats[aIdx].assists = (winStats[aIdx].assists || 0) + 1;
            winStats[aIdx].damage += 35 + Math.floor(Math.random() * 30);
        }
    }
    
    for (let i = 0; i < actualLoserKills; i++) {
        if (loseStats.length === 0) continue;
        const kIdx = getWeightedRandomIndex(loseStats, loseTeamData, isCS2, roundKills, matchAvgRating);
        loseStats[kIdx].kills++;
        loseStats[kIdx].damage += 85 + Math.floor(Math.random() * 15);
        roundKills.set(loseStats[kIdx].nickname, (roundKills.get(loseStats[kIdx].nickname) || 0) + 1);
        
        if (i < winVictims.length) {
            const vIdx = winVictims[i];
            winStats[vIdx].deaths++;
        }
        
        if (Math.random() < 0.20) {
            let aIdx = getWeightedAssist(loseStats, loseTeamData, kIdx, isCS2);
            loseStats[aIdx].assists = (loseStats[aIdx].assists || 0) + 1;
            loseStats[aIdx].damage += 35 + Math.floor(Math.random() * 30);
        }
    }
    
    const aces = [];
    for (const [nickname, kills] of roundKills.entries()) {
        if (kills === 5) aces.push(nickname);
    }
    return { aces };
}



import { MatchEngine } from '../match-logic';

export function simulateMap(
    team1Input: any[], team2Input: any[], 
    team1Synergy: number, team2Synergy: number, 
    team1Tactic: string, team2Tactic: string, 
    mapName: string, format: string, isCS2: boolean,
    team1Form: number = 0, team2Form: number = 0,
    team1MapExp: number = 50, team2MapExp: number = 50,
    pickedByTeam: 1 | 2 | null = null,
    customSeed?: number
) {
    // Generate or use provided seed
    const seed = customSeed !== undefined ? customSeed : Math.floor(Math.random() * 1000000);
    
    const t1 = (team1Input || []).slice(0, 5).map((p, i) => {
        if (!p) return { id: `t1_${i}_unknown`, nickname: 'Unknown', role: 'rifler', rating: 100 };
        return { ...p, id: p.id || `t1_${i}_${p.nickname}` };
    });
    const t2 = (team2Input || []).slice(0, 5).map((p, i) => {
        if (!p) return { id: `t2_${i}_unknown`, nickname: 'Unknown', role: 'rifler', rating: 100 };
        return { ...p, id: p.id || `t2_${i}_${p.nickname}` };
    });

    // Create new engine state
    const state = MatchEngine.createInitialState(
        t1, t2,
        isCS2, mapName, format, seed
    );
    
    // Run simulation
    const result = MatchEngine.simulateEntireMatch(state);
    
    const mapRounds = result.team1Score + result.team2Score;
    result.team1Stats.forEach((s: any) => s.totalRounds = mapRounds);
    result.team2Stats.forEach((s: any) => s.totalRounds = mapRounds);
    finalizeStats(result.team1Stats);
    finalizeStats(result.team2Stats);

    return result;
}


function finalizeStats(stats: any[]) {
    stats.forEach(s => {
        if (!s.totalRounds || s.totalRounds === 0) s.totalRounds = 1;
        s.kd = (s.kills / (s.deaths || 1)).toFixed(2);
        s.adr = (s.damage / s.totalRounds).toFixed(1);
        s.kpr = (s.kills / s.totalRounds).toFixed(2);
        s.dpr = (s.deaths / s.totalRounds).toFixed(2);
        s.kast = "70%";
        
        const killRating = (s.kills / s.totalRounds) / 0.677;
        const survivalRating = ((s.totalRounds - s.deaths) / s.totalRounds) / 0.31;
        const rmKills = (s.k1 || 0) + (s.k2 || 0)*2 + (s.k3 || 0)*3 + (s.k4 || 0)*4 + (s.k5 || 0)*5;
        const multikillRating = (rmKills / s.totalRounds) / 1.27;
        const impact = 2.13 * (s.kills / s.totalRounds) + 0.42 * ((s.assists || 0) / s.totalRounds) - 0.41;
        s.hltvRating = ((killRating + survivalRating + multikillRating + impact + 1) / 5).toFixed(2);
    });
}

export function simulateMatchSeries(

    team1Input: any[], team2Input: any[], 
    team1Synergy: number, team2Synergy: number, 
    team1Tactic: string, team2Tactic: string, 
    maps: string[], format: string, isCS2: boolean, 
    tournamentName: string,
    team1Form: number = 0, team2Form: number = 0,
    team1MapExp: Record<string, number> = {}, team2MapExp: Record<string, number> = {},
    mapPickByArr?: (1 | 2 | null)[]
) {
    // Only starting 5 players play in matches (bench players are excluded)
    const team1 = (team1Input || []).slice(0, 5).map((p, i) => {
        if (!p) return { id: `t1_${i}_unknown`, nickname: 'Unknown', role: 'rifler', rating: 100 };
        return { ...p, id: p.id || `t1_${i}_${p.nickname}` };
    });
    const team2 = (team2Input || []).slice(0, 5).map((p, i) => {
        if (!p) return { id: `t2_${i}_unknown`, nickname: 'Unknown', role: 'rifler', rating: 100 };
        return { ...p, id: p.id || `t2_${i}_${p.nickname}` };
    });

    const bo = maps.length;
    const winsNeeded = Math.ceil(bo / 2);
    
    const results = {
        tournamentName,
        format,
        bo,
        gameMode: isCS2 ? 'cs2' : 's2',
        team1Name: 'Team 1',
        team2Name: 'Team 2',
        team1Score: 0,
        team2Score: 0,
        maps: [] as any[],
        team1Stats: team1.map(p => ({ id: p.id, nickname: p.nickname, role: p.role, rating: p.rating, kills: 0, deaths: 0, assists: 0, damage: 0, totalRounds: 0 })) as any[],
        team2Stats: team2.map(p => ({ id: p.id, nickname: p.nickname, role: p.role, rating: p.rating, kills: 0, deaths: 0, assists: 0, damage: 0, totalRounds: 0 })) as any[]
    };

    for (let i = 0; i < maps.length; i++) {
        const mapName = maps[i];
        let mapResult: any = null;
        let valid = false;
        let attempts = 0;
        
        let pickedByTeam: 1 | 2 | null = null;
        if (mapPickByArr && mapPickByArr[i] !== undefined) {
            pickedByTeam = mapPickByArr[i];
        } else if (bo === 3) {
            if (i === 0) pickedByTeam = 1;
            else if (i === 1) pickedByTeam = 2;
        } else if (bo === 5) {
            if (i === 0 || i === 2) pickedByTeam = 1;
            else if (i === 1 || i === 3) pickedByTeam = 2;
        }
        
        while (!valid && attempts < 10) {
            mapResult = simulateMap(
                team1, team2, team1Synergy, team2Synergy, team1Tactic, team2Tactic, mapName, format, isCS2,
                team1Form, team2Form,
                team1MapExp[mapName] || 50, team2MapExp[mapName] || 50,
                pickedByTeam
            );
            
            valid = true; // verifyStats(mapResult);
            attempts++;
            if (!valid) {
                console.warn(`Map simulation failed validation (attempt ${attempts}), recalculating...`);
            }
        }
        
        const mapRounds = mapResult.team1Score + mapResult.team2Score;
        
        mapResult.team1Stats.forEach((s: any) => s.totalRounds = mapRounds);
        mapResult.team2Stats.forEach((s: any) => s.totalRounds = mapRounds);
        finalizeStats(mapResult.team1Stats);
        finalizeStats(mapResult.team2Stats);

        results.maps.push(mapResult);

        if (mapResult.winner === 1) results.team1Score++;
        else results.team2Score++;
        
        mapResult.team1Stats.forEach((stat, idx) => {
            results.team1Stats[idx].kills += stat.kills;
            results.team1Stats[idx].deaths += stat.deaths;
            results.team1Stats[idx].assists += stat.assists;
            results.team1Stats[idx].damage += stat.damage;
            results.team1Stats[idx].totalRounds += mapRounds;
            (results.team1Stats[idx] as any).k1 = ((results.team1Stats[idx] as any).k1 || 0) + (stat.k1 || 0);
            (results.team1Stats[idx] as any).k2 = ((results.team1Stats[idx] as any).k2 || 0) + (stat.k2 || 0);
            (results.team1Stats[idx] as any).k3 = ((results.team1Stats[idx] as any).k3 || 0) + (stat.k3 || 0);
            (results.team1Stats[idx] as any).k4 = ((results.team1Stats[idx] as any).k4 || 0) + (stat.k4 || 0);
            (results.team1Stats[idx] as any).k5 = ((results.team1Stats[idx] as any).k5 || 0) + (stat.k5 || 0);
            (results.team1Stats[idx] as any).fk = ((results.team1Stats[idx] as any).fk || 0) + (stat.fk || 0);
            (results.team1Stats[idx] as any).fd = ((results.team1Stats[idx] as any).fd || 0) + (stat.fd || 0);
        });
        
        mapResult.team2Stats.forEach((stat, idx) => {
            results.team2Stats[idx].kills += stat.kills;
            results.team2Stats[idx].deaths += stat.deaths;
            results.team2Stats[idx].assists += stat.assists;
            results.team2Stats[idx].damage += stat.damage;
            results.team2Stats[idx].totalRounds += mapRounds;
            (results.team2Stats[idx] as any).k1 = ((results.team2Stats[idx] as any).k1 || 0) + (stat.k1 || 0);
            (results.team2Stats[idx] as any).k2 = ((results.team2Stats[idx] as any).k2 || 0) + (stat.k2 || 0);
            (results.team2Stats[idx] as any).k3 = ((results.team2Stats[idx] as any).k3 || 0) + (stat.k3 || 0);
            (results.team2Stats[idx] as any).k4 = ((results.team2Stats[idx] as any).k4 || 0) + (stat.k4 || 0);
            (results.team2Stats[idx] as any).k5 = ((results.team2Stats[idx] as any).k5 || 0) + (stat.k5 || 0);
            (results.team2Stats[idx] as any).fk = ((results.team2Stats[idx] as any).fk || 0) + (stat.fk || 0);
            (results.team2Stats[idx] as any).fd = ((results.team2Stats[idx] as any).fd || 0) + (stat.fd || 0);
        });

        if (results.team1Score >= winsNeeded || results.team2Score >= winsNeeded) break;
    }

    finalizeStats(results.team1Stats);
    finalizeStats(results.team2Stats);

    const allPlayers = [...results.team1Stats, ...results.team2Stats];
    let mvp = null as any | null, bestScore = -1;
    allPlayers.forEach(p => {
        const score = (parseFloat(p.kd || '0') * 0.4) + (p.kills * 0.3) + (parseFloat(p.hltvRating || '0') * 0.3);
        if (score > bestScore) {
            bestScore = score;
            mvp = p;
        }
    });
    
    (results as any).mvp = mvp;

    const achievements: any[] = [];
    
    // Check match level achievements
    if (results.team1Score === 0 || results.team2Score === 0) {
        if (bo > 1) { // 3-0 or 2-0
            const winner = results.team1Score > results.team2Score ? 1 : 2;
            achievements.push({
                type: 'DOMINATION',
                team: winner,
                title: 'ДОМИНАЦИЯ',
                description: 'Победа в матче без проигранных карт',
                icon: '👑'
            });
        }
    }

    results.maps.forEach(map => {
        // Flawless
        if (map.team1Score === 0 || map.team2Score === 0) {
            achievements.push({
                type: 'FLAWLESS',
                team: map.team1Score > map.team2Score ? 1 : 2,
                title: 'СУХАЯ ПОБЕДА',
                description: `Победа на карте ${map.mapName} всухую`,
                icon: '🛡️'
            });
        }
        
        // Domination (13-3 or 16-3 etc)
        if (map.team1Score <= 3 && map.team2Score >= 13) {
            achievements.push({
                type: 'DOMINATION',
                team: 2,
                title: 'РАЗГРОМ',
                description: `Разгромная победа на карте ${map.mapName}`,
                icon: '🔨'
            });
        } else if (map.team2Score <= 3 && map.team1Score >= 13) {
            achievements.push({
                type: 'DOMINATION',
                team: 1,
                title: 'РАЗГРОМ',
                description: `Разгромная победа на карте ${map.mapName}`,
                icon: '🔨'
            });
        }

        // Comeback
        let maxT1Deficit = 0;
        let maxT2Deficit = 0;
        let t1Score = 0;
        let t2Score = 0;
        map.roundLogs.forEach((log: any) => {
            if (log.t2Score - log.t1Score > maxT1Deficit) maxT1Deficit = log.t2Score - log.t1Score;
            if (log.t1Score - log.t2Score > maxT2Deficit) maxT2Deficit = log.t1Score - log.t2Score;
            
            if (log.aces && log.aces.length > 0) {
                log.aces.forEach((player: string) => {
                    const team = map.team1Stats.find((s: any) => s.nickname === player) ? 1 : 2;
                    achievements.push({
                        type: 'ACE',
                        team,
                        player,
                        title: 'ЭЙС',
                        description: `Сделал -5 в раунде ${log.round} на карте ${map.mapName}`,
                        icon: '🔥'
                    });
                });
            }
        });

        if (map.winner === 1 && maxT1Deficit >= 6) {
            achievements.push({
                type: 'COMEBACK',
                team: 1,
                title: 'ВЕЛИКИЙ КАМБЭК',
                description: `Победа на ${map.mapName} после отставания в ${maxT1Deficit} раундов`,
                icon: '🔄'
            });
        } else if (map.winner === 2 && maxT2Deficit >= 6) {
            achievements.push({
                type: 'COMEBACK',
                team: 2,
                title: 'ВЕЛИКИЙ КАМБЭК',
                description: `Победа на ${map.mapName} после отставания в ${maxT2Deficit} раундов`,
                icon: '🔄'
            });
        }

        // Carry and Unkillable
        [...map.team1Stats, ...map.team2Stats].forEach(p => {
            const team = map.team1Stats.find((s: any) => s.nickname === p.nickname) ? 1 : 2;
            if (p.kills >= 30) {
                achievements.push({
                    type: 'CARRY',
                    team,
                    player: p.nickname,
                    title: 'ЖЕСТКИЙ КЕРРИ',
                    description: `${p.kills} убийств за одну карту (${map.mapName})`,
                    icon: '💪'
                });
            }
            if (parseFloat(p.kd || '0') >= 3.0 && p.kills >= 15) {
                achievements.push({
                    type: 'UNKILLABLE',
                    team,
                    player: p.nickname,
                    title: 'НЕУБИВАЕМЫЙ',
                    description: `K/D ${p.kd} на карте ${map.mapName}`,
                    icon: '👻'
                });
            }
        });
    });

    (results as any).achievements = achievements;

    return results;
}
