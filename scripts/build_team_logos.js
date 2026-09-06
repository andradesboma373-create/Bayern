import fs from 'fs';
import path from 'path';

// Master list of team definitions: canonical name, svg source filename, and aliases
const TEAMS_DEF = [
  { name: "Natus Vincere", src: "navi.svg", aliases: ["navi", "na vi", "natus vincere", "natusvincere", "рожденные побеждать"] },
  { name: "Team Vitality", src: "vita.svg", aliases: ["vitality", "team vitality", "teamvitality", "vita"] },
  { name: "Team Spirit", src: "spir.svg", aliases: ["spirit", "team spirit", "teamspirit", "spir"] },
  { name: "FaZe Clan", src: "faze.svg", aliases: ["faze", "faze clan", "fazeclan"] },
  { name: "G2 Esports", src: "g2.svg", aliases: ["g2", "g2 esports", "g2esports"] },
  { name: "MOUZ", src: "mouz.svg", aliases: ["mouz", "mousesports"] },
  { name: "Virtus.pro", src: "vp.svg", aliases: ["vp", "virtus pro", "virtus.pro", "virtuspro", "виртус про"] },
  { name: "Astralis", src: "astr.svg", aliases: ["astralis", "astr"] },
  { name: "Heroic", src: "hero.svg", aliases: ["heroic", "hero"] },
  { name: "FURIA Esports", src: "furi.svg", aliases: ["furia", "furia esports", "furiaesports", "furi"] },
  { name: "Fnatic", src: "fntc.svg", aliases: ["fnatic", "fntc"] },
  { name: "Team Falcons", src: "fal.svg", aliases: ["falcons", "team falcons", "teamfalcons", "fal"] },
  { name: "BetBoom Team", src: "bb.svg", aliases: ["betboom", "betboom team", "betboomteam", "bb"] },
  { name: "Cloud9", src: "c9.svg", aliases: ["cloud9", "cloud 9", "c9"] },
  { name: "Team Liquid", src: "liq.svg", aliases: ["liquid", "team liquid", "teamliquid", "liq"] },
  { name: "The MongolZ", src: "mngz.svg", aliases: ["the mongolz", "mongolz", "themongolz", "mngz"] },
  { name: "Eternal Fire", src: "eter.svg", aliases: ["eternal fire", "eternalfire", "eter"] },
  { name: "paiN Gaming", src: "pain.svg", aliases: ["pain", "pain gaming", "paingaming"] },
  { name: "MIBR", src: "mibr.svg", aliases: ["mibr", "made in brazil"] },
  { name: "SAW", src: "saw.svg", aliases: ["saw"] },
  { name: "ENCE", src: "ence.svg", aliases: ["ence"] },
  { name: "GamerLegion", src: "gl.svg", aliases: ["gamerlegion", "gamer legion", "gl"] },
  { name: "3DMAX", src: "3dm.svg", aliases: ["3dmax", "3dm"] },
  { name: "Lynn Vision Gaming", src: "lynn.svg", aliases: ["lynn vision", "lynn vision gaming", "lynnvision", "lynn"] },
  { name: "Wildcard", src: "wcrd.svg", aliases: ["wildcard", "wildcard gaming", "wcrd"] },
  { name: "M80", src: "m80.svg", aliases: ["m80"] },
  { name: "BIG", src: "big.svg", aliases: ["big", "berlin international gaming"] },
  { name: "Ninjas in Pyjamas", src: "nip.svg", aliases: ["ninjas in pyjamas", "nip", "ninjasinpyjamas"] },
  { name: "PARIVISION", src: "pari.svg", aliases: ["parivision", "pari vision", "pari"] },
  { name: "Aurora Gaming", src: "aura.svg", aliases: ["aurora", "aurora gaming", "aura"] },
  { name: "B8", src: "b8.svg", aliases: ["b8", "b8 esports"] },
  { name: "9z Team", src: "zzn.svg", aliases: ["9z", "9z team", "9zteam", "zzn"] },
  { name: "BESTIA", src: "bes.svg", aliases: ["bestia", "bes"] },
  { name: "Legacy", src: "lgcy.svg", aliases: ["legacy", "lgcy"] },
  { name: "FUT Esports", src: "fut.svg", aliases: ["fut", "fut esports", "futesports"] },
  { name: "9INE", src: "nine.svg", aliases: ["9ine", "nine"] },
  { name: "Complexity Gaming", src: "col.svg", aliases: ["complexity", "complexity gaming", "col", "cplx"] },
  { name: "Sharks Esports", src: "shrk.svg", aliases: ["sharks", "sharks esports", "shrk"] },
  { name: "NRG", src: "nrg.svg", aliases: ["nrg", "nrg esports"] },
  { name: "The Huns", src: "huns.svg", aliases: ["the huns", "the huns esports", "huns"] },
  { name: "1WIN", src: "wins.svg", aliases: ["1win", "1 win", "wins"] },
  { name: "FlyQuest", src: "fq.svg", aliases: ["flyquest", "fq"] },
  { name: "Nemiga Gaming", src: "nemi.svg", aliases: ["nemiga", "nemiga gaming", "nemi"] },
  { name: "Monte", src: "mont.svg", aliases: ["monte", "mont"] },
  { name: "Apeks", src: "apex.svg", aliases: ["apeks", "apex"] },
  { name: "ECSTATIC", src: "ecst.svg", aliases: ["ecstatic", "ecst"] },
  { name: "FORZE", src: "forz.svg", aliases: ["forze", "forz"] },
  { name: "OG", src: "og.svg", aliases: ["og", "og esports"] },
  { name: "KOI", src: "koi.svg", aliases: ["koi"] },
  { name: "SINNERS Esports", src: "sinn.svg", aliases: ["sinners", "sinners esports", "sinn"] },
  { name: "TYLOO", src: "tyl.svg", aliases: ["tyloo", "tyl"] },
  { name: "TSM", src: "tsm.svg", aliases: ["tsm", "team solomid"] },
  { name: "Imperial Esports", src: "imp.svg", aliases: ["imperial", "imperial esports", "imp"] },
  { name: "Bad News Eagles", src: "bne.svg", aliases: ["bad news eagles", "bne"] },
  { name: "Outsiders", src: "out.svg", aliases: ["outsiders", "out"] },
  { name: "OpTic Gaming", src: "optc.svg", aliases: ["optic", "optic gaming", "optc"] },
  { name: "Entropiq", src: "ent.svg", aliases: ["entropiq", "ent"] },
  { name: "Sprout", src: "spc.svg", aliases: ["sprout", "spc"] },
  { name: "Renegades", src: "ren.svg", aliases: ["renegades", "ren"] },
  { name: "Luminosity Gaming", src: "lumi.svg", aliases: ["luminosity", "luminosity gaming", "lumi"] },
  { name: "Dignitas", src: "dig.svg", aliases: ["dignitas", "team dignitas", "dig"] },
  { name: "Gambit Esports", src: "gamb.svg", aliases: ["gambit", "gambit esports", "gamb"] },
  { name: "Gaimin Gladiators", src: "gaim.svg", aliases: ["gaimin gladiators", "gaim"] },
  { name: "Grayhound Gaming", src: "gray.svg", aliases: ["grayhound", "grayhound gaming", "gray"] },
  { name: "Into The Breach", src: "itb.svg", aliases: ["into the breach", "itb"] },
  { name: "Copenhagen Flames", src: "cope.svg", aliases: ["copenhagen flames", "cope"] },
  { name: "Fluxo", src: "flux.svg", aliases: ["fluxo", "flux"] },
  { name: "RED Canids", src: "redc.svg", aliases: ["red canids", "redc"] },
  { name: "iBUYPOWER", src: "ibp.svg", aliases: ["ibuypower", "ibp"] },
  { name: "CR4ZY", src: "cr4z.svg", aliases: ["cr4zy", "cr4z"] },
  { name: "CLG", src: "clg.svg", aliases: ["clg", "counter logic gaming"] },
  { name: "Keyd Stars", src: "keyd.svg", aliases: ["keyd", "keyd stars"] },
  { name: "Orbit", src: "orbit.svg", aliases: ["orbit"] },
  { name: "PENTA Sports", src: "penta.svg", aliases: ["penta", "penta sports"] },
  { name: "SK Gaming", src: "sk.svg", aliases: ["sk", "sk gaming"] },
  { name: "Titan", src: "tit.svg", aliases: ["titan", "tit"] },
  { name: "Vega Squadron", src: "vega.svg", aliases: ["vega", "vega squadron"] },
  { name: "Vici Gaming", src: "vici.svg", aliases: ["vici", "vici gaming", "vg"] },
  { name: "Windigo Gaming", src: "wgg.svg", aliases: ["windigo", "windigo gaming", "wgg"] },
  { name: "FlipSid3 Tactics", src: "flip.svg", aliases: ["flipsid3", "flip"] },
  { name: "Team Envy", src: "nv.svg", aliases: ["envy", "team envy", "nv"] },
  { name: "Team LDLC", src: "ldlc.svg", aliases: ["ldlc", "team ldlc"] },
  { name: "Immortals", src: "imt.svg", aliases: ["immortals", "imt"] },
  { name: "INTZ", src: "intz.svg", aliases: ["intz"] }
];

const TARGET_DIRS = [
  path.resolve('./public/logos'),
  path.resolve('./dist/logos')
];

// 1. Copy aliases to friendly filenames
for (const team of TEAMS_DEF) {
  const srcName = team.src;
  
  for (const dir of TARGET_DIRS) {
    const srcPath = path.join(dir, srcName);
    if (!fs.existsSync(srcPath)) continue;

    const buffer = fs.readFileSync(srcPath);

    // Create a copy for each alias as <alias>.svg and sanitized name
    const friendlyNames = new Set([
      team.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      team.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      team.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      ...team.aliases.map(a => a.toLowerCase().replace(/\s+/g, '_')),
      ...team.aliases.map(a => a.toLowerCase().replace(/\s+/g, '-')),
      ...team.aliases.map(a => a.toLowerCase().replace(/\s+/g, ''))
    ]);

    for (const fn of friendlyNames) {
      if (fn && fn !== team.src.replace('.svg', '')) {
        const destPath = path.join(dir, `${fn}.svg`);
        fs.writeFileSync(destPath, buffer);
      }
    }
  }
}

// 2. Build direct lookup map for runtime O(1) matching
const runtimeLogoMap = {};
for (const team of TEAMS_DEF) {
  const logoPath = `/logos/${team.src}`;
  
  const allKeys = [
    team.name.toLowerCase().trim(),
    team.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    team.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    team.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    ...team.aliases.map(a => a.toLowerCase().trim()),
    ...team.aliases.map(a => a.toLowerCase().replace(/\s+/g, '_')),
    ...team.aliases.map(a => a.toLowerCase().replace(/\s+/g, '-')),
    ...team.aliases.map(a => a.toLowerCase().replace(/\s+/g, ''))
  ];

  for (const k of allKeys) {
    if (k) {
      runtimeLogoMap[k] = logoPath;
    }
  }
}

const mapContent = `// Auto-generated runtime logo map
export const teamLogosMap: Record<string, string> = ${JSON.stringify(runtimeLogoMap, null, 2)};

export function lookupBuiltinTeamLogo(rawName: string): string | null {
  if (!rawName) return null;
  const clean = rawName.trim().toLowerCase();
  if (teamLogosMap[clean]) return teamLogosMap[clean];

  const underscore = clean.replace(/\\s+/g, '_');
  if (teamLogosMap[underscore]) return teamLogosMap[underscore];

  const hyphen = clean.replace(/\\s+/g, '-');
  if (teamLogosMap[hyphen]) return teamLogosMap[hyphen];

  const noSpace = clean.replace(/[^a-z0-9]/g, '');
  if (teamLogosMap[noSpace]) return teamLogosMap[noSpace];

  return null;
}
`;

fs.writeFileSync(path.resolve('./src/teamLogosMap.ts'), mapContent);
console.log(`Generated src/teamLogosMap.ts with ${Object.keys(runtimeLogoMap).length} mapped keys.`);

// 3. Update teamsList.json for Autocomplete
const allCanonicalTeams = TEAMS_DEF.map(t => t.name).sort((a, b) => a.localeCompare(b));
fs.writeFileSync(path.resolve('./src/teamsList.json'), JSON.stringify(allCanonicalTeams, null, 2));
console.log(`Updated src/teamsList.json with ${allCanonicalTeams.length} canonical team names.`);
