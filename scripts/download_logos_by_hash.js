import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const teams = [
  "Falcons",
  "Vitality",
  "SPIRIT",
  "FURIA",
  "Natus Vincere",
  "9z",
  "Aurora",
  "G2",
  "BETBOOM",
  "MOUZ",
  "Legacy",
  "FUT",
  "B8",
  "PARIVISION",
  "GamerLegion",
  "The mongolz",
  "FaZe",
  "Astralis",
  "TYLOO",
  "paIN",
  "MIBR",
  "magic",
  "Luminosity",
  "BIG",
  "Alliance",
  "M80",
  "Ninjas in Pyjamas",
  "Liquid",
  "Inner circle",
  "Lynn vision",
  "Sharks",
  "Nemesis",
  "3DMAX",
  "BC game",
  "EYEBALLERS",
  "NRG",
  "Wildcard",
  "HEROIC",
  "Acend",
  "Gentle Mates",
  "Cybershoke",
  "Nuclear TigeRES",
  "HOTU",
  "Virtus pro",
  "SINNERS",
  "FOKUS",
  "TDK",
  "Walczaki",
  "1win",
  "INFINITE",
  "The Huns",
  "GenOne",
  "9INE",
  "K27",
  "100 Thieves",
  "BESTIA",
  "THUNDER dOWNUNDER",
  "Sashi",
  "OG",
  "Fnatic",
  "Imperial",
  "WW team",
  "Eternal fire",
  "Nemiga",
  "ShindeN"
];

// Special hardcoded candidates for problematic teams
const customCandidates = {
  "Falcons": ["Team_Falcons_2022_allmode.png", "Team_Falcons_allmode.png"],
  "Vitality": ["Team_Vitality_2020_allmode.png", "Team_Vitality_allmode.png"],
  "SPIRIT": ["Team_Spirit_2021_allmode.png", "Team_Spirit_allmode.png", "Team_Spirit_2024_allmode.png"],
  "FURIA": ["FURIA_Esports_allmode.png", "FURIA_Esports_2020_allmode.png"],
  "Natus Vincere": ["Natus_Vincere_allmode.png", "Natus_Vincere_2020_allmode.png"],
  "9z": ["9z_Team_allmode.png", "9z_Team_2021_allmode.png"],
  "Aurora": ["Aurora_Gaming_2022_allmode.png", "Aurora_Gaming_allmode.png"],
  "G2": ["G2_Esports_2021_allmode.png", "G2_Esports_allmode.png"],
  "BETBOOM": ["BetBoom_Team_2024_allmode.png", "BetBoom_Team_allmode.png"],
  "MOUZ": ["MOUZ_2021_allmode.png", "MOUZ_allmode.png"],
  "Legacy": ["Legacy_Esports_allmode.png", "Legacy_allmode.png"],
  "FUT": ["FUT_Esports_allmode.png", "FUT_allmode.png", "FUT_Esports_logo.png", "Fut_Esports_allmode.png"],
  "B8": ["B8_allmode.png", "B8_Esports_allmode.png"],
  "PARIVISION": ["PARIVISION_allmode.png", "PARIVISION_2023_allmode.png"],
  "GamerLegion": ["GamerLegion_allmode.png", "GamerLegion_2020_allmode.png"],
  "The mongolz": ["The_Mongolz_2023_allmode.png", "The_Mongolz_allmode.png", "The_mongolz_2023_allmode.png", "The_mongolz_allmode.png"],
  "FaZe": ["FaZe_Clan_allmode.png", "FaZe_Clan_2020_allmode.png"],
  "Astralis": ["Astralis_allmode.png", "Astralis_2017_allmode.png"],
  "TYLOO": ["TYLOO_allmode.png", "TYLOO_2020_allmode.png", "TyLoo_allmode.png", "Tyloo_allmode.png"],
  "paIN": ["PaIN_Gaming_allmode.png", "PaIN_Gaming_2020_allmode.png", "paIN_Gaming_allmode.png", "Pain_Gaming_allmode.png"],
  "MIBR": ["MIBR_allmode.png", "MIBR_2018_allmode.png"],
  "magic": ["Magic_allmode.png", "Magic_Esports_allmode.png", "Magic_Gaming_allmode.png", "Magic_esports_allmode.png"],
  "Luminosity": ["Luminosity_Gaming_allmode.png", "Luminosity_Gaming_2020_allmode.png"],
  "BIG": ["BIG_allmode.png", "BIG_2017_allmode.png"],
  "Alliance": ["Alliance_allmode.png", "Alliance_2020_allmode.png"],
  "M80": ["M80_allmode.png", "M80_2023_allmode.png"],
  "Ninjas in Pyjamas": ["Ninjas_in_Pyjamas_2023_allmode.png", "Ninjas_in_Pyjamas_allmode.png"],
  "Liquid": ["Team_Liquid_2020_allmode.png", "Team_Liquid_allmode.png"],
  "Inner circle": ["Inner_Circle_allmode.png", "Inner_circle_allmode.png", "Inner_Circle_Esports_allmode.png"],
  "Lynn vision": ["Lynn_Vision_Gaming_allmode.png", "Lynn_Vision_Gaming_2020_allmode.png"],
  "Sharks": ["Sharks_Esports_allmode.png", "Sharks_Esports_2020_allmode.png"],
  "Nemesis": ["Nemesis_allmode.png", "Nemesis_Esports_allmode.png"],
  "3DMAX": ["3DMAX_2023_allmode.png", "3DMAX_allmode.png"],
  "BC game": ["BC.Game_allmode.png", "BC.Game_Esports_allmode.png", "BC_Game_allmode.png"],
  "EYEBALLERS": ["EYEBALLERS_allmode.png", "EYEBALLERS_2022_allmode.png"],
  "NRG": ["NRG_Esports_allmode.png", "NRG_Esports_2020_allmode.png"],
  "Wildcard": ["Wildcard_Gaming_allmode.png", "Wildcard_Gaming_2023_allmode.png"],
  "HEROIC": ["Heroic_2023_allmode.png", "Heroic_allmode.png"],
  "Acend": ["Acend_allmode.png", "Acend_2021_allmode.png"],
  "Gentle Mates": ["Gentle_Mates_allmode.png"],
  "Cybershoke": ["CYBERSHOKE_Esports_allmode.png", "Cybershoke_allmode.png"],
  "Nuclear TigeRES": ["Nuclear_TigeRES_allmode.png", "Nuclear_TigeRES_2022_allmode.png"],
  "HOTU": ["HOTU_allmode.png"],
  "Virtus pro": ["Virtus.pro_2024_allmode.png", "Virtus.pro_allmode.png", "Virtus_pro_allmode.png", "Virtus.pro_logo.png"],
  "SINNERS": ["SINNERS_Esports_allmode.png", "SINNERS_Esports_2020_allmode.png"],
  "FOKUS": ["FOKUS_allmode.png", "FOKUS_Clan_allmode.png"],
  "TDK": ["TDK_allmode.png"],
  "Walczaki": ["Walczaki_allmode.png"],
  "1win": ["1win_allmode.png", "1win_2022_allmode.png"],
  "INFINITE": ["Infinite_Gaming_allmode.png", "INFINITE_allmode.png"],
  "The Huns": ["The_Huns_allmode.png", "The_Huns_Esports_allmode.png", "The_huns_allmode.png"],
  "GenOne": ["GenOne_allmode.png"],
  "9INE": ["9INE_allmode.png", "9INE_2022_allmode.png"],
  "K27": ["K27_allmode.png", "K27_2023_allmode.png"],
  "100 Thieves": ["100_Thieves_allmode.png", "100_Thieves_2020_allmode.png"],
  "BESTIA": ["BESTIA_allmode.png", "BESTIA_2022_allmode.png"],
  "THUNDER dOWNUNDER": ["Thunder_Down_Under_allmode.png", "Thunder_down_under_allmode.png", "Thunder_Down_Under_Esports_allmode.png"],
  "Sashi": ["Sashi_Esport_allmode.png", "Sashi_Esport_2023_allmode.png", "Sashi_allmode.png"],
  "OG": ["OG_allmode.png", "OG_2019_allmode.png"],
  "Fnatic": ["Fnatic_allmode.png", "Fnatic_2020_allmode.png"],
  "Imperial": ["Imperial_Esports_allmode.png", "Imperial_Esports_2020_allmode.png", "Imperial_allmode.png"],
  "WW team": ["WW_Team_allmode.png", "Ww_team_allmode.png", "WW_allmode.png"],
  "Eternal fire": ["Eternal_Fire_allmode.png", "Eternal_Fire_2021_allmode.png", "Eternal_fire_allmode.png"],
  "Nemiga": ["Nemiga_Gaming_allmode.png", "Nemiga_Gaming_2021_allmode.png", "Nemiga_allmode.png"],
  "ShindeN": ["ShindeN_allmode.png", "Shinden_allmode.png"]
};

const logoDir = path.resolve('./public/logos');
if (!fs.existsSync(logoDir)) {
  fs.mkdirSync(logoDir, { recursive: true });
}

function getLiquipediaImageUrl(filename) {
  const hash = crypto.createHash('md5').update(filename).digest('hex');
  const h1 = hash.charAt(0);
  const h2 = hash.substring(0, 2);
  return `https://liquipedia.net/commons/images/${h1}/${h2}/${filename}`;
}

function testAndDownload(url, destPath) {
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';
  const cmd = `curl -s -f -L --connect-timeout 3 -m 6 -H "User-Agent: ${ua}" "${url}" -o "${destPath}"`;
  try {
    execSync(cmd, { stdio: 'ignore' });
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 100) {
      return true;
    }
  } catch (e) {
    // Fail silently
  }
  if (fs.existsSync(destPath)) {
    fs.unlinkSync(destPath);
  }
  return false;
}

// Convert a name to CamelCase string split by Underscores (e.g. "The mongolz" -> "The_Mongolz")
function getCamelCaseSlug(name) {
  return name.split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('_');
}

function generateCandidates(teamName) {
  const candidates = [];
  
  if (customCandidates[teamName]) {
    candidates.push(...customCandidates[teamName]);
  }
  
  const rawSlug = teamName.replace(/\s+/g, '_');
  const camelSlug = getCamelCaseSlug(teamName);
  
  const slugs = [camelSlug, rawSlug, teamName.toUpperCase().replace(/\s+/g, '_')];
  const prefixes = ['', 'Team_', 'Esports_'];
  const suffixes = ['', '_Esports', '_Gaming', '_Esport', '_Team'];
  const years = ['_2024', '_2023', '_2022', '_2021', '_2020', '_2019', '_2018', '_2017', ''];
  const modes = ['_allmode.png', '_lightmode.png', '_darkmode.png', '_full_allmode.png', '_logo.png'];
  
  for (const slug of slugs) {
    for (const pre of prefixes) {
      for (const suf of suffixes) {
        for (const y of years) {
          for (const m of modes) {
            const file = `${pre}${slug}${suf}${y}${m}`;
            if (!candidates.includes(file)) {
              candidates.push(file);
            }
          }
        }
      }
    }
  }
  
  return candidates;
}

async function run() {
  console.log(`Starting hashed logo downloader for ${teams.length} teams...`);
  let successCount = 0;
  let skippedCount = 0;
  
  for (const team of teams) {
    const cleanName = team.trim();
    const lowerName = cleanName.toLowerCase();
    const originalFileName = `${lowerName}.png`;
    const destPath = path.join(logoDir, originalFileName);
    
    // Check if the logo is already downloaded and non-empty
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 100) {
      console.log(`Skipping "${cleanName}" (already exists)`);
      skippedCount++;
      successCount++;
      continue;
    }
    
    console.log(`Processing "${cleanName}"...`);
    
    const candidates = generateCandidates(cleanName);
    let downloaded = false;
    
    // Check first 20 candidates (most likely to succeed) to keep it super fast
    for (const filename of candidates.slice(0, 20)) {
      const url = getLiquipediaImageUrl(filename);
      if (testAndDownload(url, destPath)) {
        console.log(`  [SUCCESS] Downloaded ${filename}`);
        downloaded = true;
        break;
      }
    }
    
    if (!downloaded) {
      // Extended search up to 60 candidates if first 20 fail
      for (const filename of candidates.slice(20, 60)) {
        const url = getLiquipediaImageUrl(filename);
        if (testAndDownload(url, destPath)) {
          console.log(`  [SUCCESS] Downloaded ${filename} (from extended search)`);
          downloaded = true;
          break;
        }
      }
    }
    
    if (downloaded) {
      successCount++;
      // Create duplicate name formats to ensure robust matching in React
      const duplicates = [
        lowerName.replace(/\s+/g, '_'),
        lowerName.replace(/\s+/g, '-'),
        lowerName.replace(/\s+/g, ''),
        lowerName + '.png',
      ];
      for (const dup of duplicates) {
        const dupPath = path.join(logoDir, `${dup}.png`);
        if (dupPath !== destPath && !fs.existsSync(dupPath)) {
          fs.copyFileSync(destPath, dupPath);
        }
      }
    } else {
      console.log(`  [FAILED] No candidate matched for "${cleanName}"`);
    }
    
    // Small delay to prevent network strain
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`Finished! Downloaded ${successCount - skippedCount} new logos. Total successfully stored: ${successCount}/${teams.length}.`);
}

run();
