import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const mappings = {
  "falcons": { slug: "Team_Falcons", filename: "falcons" },
  "vitality": { slug: "Team_Vitality", filename: "vitality" },
  "spirit": { slug: "Team_Spirit", filename: "spirit" },
  "furia": { slug: "FURIA_Esports", filename: "furia" },
  "natus_vincere": { slug: "Natus_Vincere", filename: "natus_vincere" },
  "natus vincere": { slug: "Natus_Vincere", filename: "natus_vincere" },
  "9z": { slug: "9z_Team", filename: "9z" },
  "aurora": { slug: "Aurora_Gaming", filename: "aurora" },
  "g2": { slug: "G2_Esports", filename: "g2" },
  "betboom": { slug: "BetBoom_Team", filename: "betboom" },
  "mouz": { slug: "MOUZ", filename: "mouz" },
  "legacy": { slug: "Legacy_Esports", filename: "legacy" },
  "fut": { slug: "FUT_Esports", filename: "fut" },
  "b8": { slug: "B8", filename: "b8" },
  "parivision": { slug: "PARIVISION", filename: "parivision" },
  "gamerlegion": { slug: "GamerLegion", filename: "gamerlegion" },
  "the mongolz": { slug: "The_Mongolz", filename: "the_mongolz" },
  "faze": { slug: "FaZe_Clan", filename: "faze" },
  "astralis": { slug: "Astralis", filename: "astralis" },
  "tyloo": { slug: "TYLOO", filename: "tyloo" },
  "pain": { slug: "paIN_Gaming", filename: "pain" },
  "mibr": { slug: "MIBR", filename: "mibr" },
  "magic": { slug: "Magic_Esports", filename: "magic" },
  "luminosity": { slug: "Luminosity_Gaming", filename: "luminosity" },
  "big": { slug: "BIG", filename: "big" },
  "alliance": { slug: "Alliance", filename: "alliance" },
  "m80": { slug: "M80", filename: "m80" },
  "ninjas in pyjamas": { slug: "Ninjas_in_Pyjamas", filename: "ninjas_in_pyjamas" },
  "liquid": { slug: "Team_Liquid", filename: "liquid" },
  "inner circle": { slug: "Inner_Circle", filename: "inner_circle" },
  "lynn vision": { slug: "Lynn_Vision_Gaming", filename: "lynn_vision" },
  "sharks": { slug: "Sharks_Esports", filename: "sharks" },
  "nemesis": { slug: "Nemesis", filename: "nemesis" },
  "3dmax": { slug: "3DMAX", filename: "3dmax" },
  "bc game": { slug: "BC.Game", filename: "bc_game" },
  "eyeballers": { slug: "EYEBALLERS", filename: "eyeballers" },
  "nrg": { slug: "NRG_Esports", filename: "nrg" },
  "wildcard": { slug: "Wildcard_Gaming", filename: "wildcard" },
  "heroic": { slug: "Heroic", filename: "heroic" },
  "acend": { slug: "Acend", filename: "acend" },
  "gentle mates": { slug: "Gentle_Mates", filename: "gentle_mates" },
  "cybershoke": { slug: "CYBERSHOKE_Esports", filename: "cybershoke" },
  "nuclear tigeres": { slug: "Nuclear_TigeRES", filename: "nuclear_tigeres" },
  "hotu": { slug: "HOTU", filename: "hotu" },
  "virtus pro": { slug: "Virtus.pro", filename: "virtus_pro" },
  "sinners": { slug: "SINNERS_Esports", filename: "sinners" },
  "fokus": { slug: "FOKUS", filename: "fokus" },
  "tdk": { slug: "TDK", filename: "tdk" },
  "walczaki": { slug: "Walczaki", filename: "walczaki" },
  "1win": { slug: "1win", filename: "1win" },
  "infinite": { slug: "Infinite_Gaming", filename: "infinite" },
  "the huns": { slug: "The_Huns", filename: "the_huns" },
  "genone": { slug: "GenOne", filename: "genone" },
  "9ine": { slug: "9INE", filename: "9ine" },
  "k27": { slug: "K27", filename: "k27" },
  "100 thieves": { slug: "100_Thieves", filename: "100_thieves" },
  "bestia": { slug: "BESTIA", filename: "bestia" },
  "thunder downunder": { slug: "Thunder_Down_Under", filename: "thunder_downunder" },
  "sashi": { slug: "Sashi_Esport", filename: "sashi" },
  "og": { slug: "OG", filename: "og" },
  "fnatic": { slug: "Fnatic", filename: "fnatic" },
  "imperial": { slug: "Imperial_Esports", filename: "imperial" },
  "ww team": { slug: "WW_Team", filename: "ww_team" },
  "eternal fire": { slug: "Eternal_Fire", filename: "eternal_fire" },
  "nemiga": { slug: "Nemiga_Gaming", filename: "nemiga" },
  "shinden": { slug: "ShindeN", filename: "shinden" }
};

const logoDir = path.resolve('./public/logos');
if (!fs.existsSync(logoDir)) {
  fs.mkdirSync(logoDir, { recursive: true });
}

function fetchUrl(url) {
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';
  const cmd = `curl -s -L -H "User-Agent: ${ua}" "${url}"`;
  return execSync(cmd, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
}

function downloadImage(url, destPath) {
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';
  const cmd = `curl -s -L -H "User-Agent: ${ua}" "${url}" -o "${destPath}"`;
  execSync(cmd);
}

async function processTeam(displayName, info) {
  console.log(`Processing team: "${displayName}" (Slug: ${info.slug})...`);
  
  const sections = ['counterstrike', 'dota2', 'valorant', 'commons'];
  let html = null;
  let successUrl = null;

  for (const section of sections) {
    const url = `https://liquipedia.net/${section}/${info.slug}`;
    try {
      html = fetchUrl(url);
      if (html && html.includes('id="mw-content-text"')) {
        successUrl = url;
        console.log(`  Success loading page from: ${url}`);
        break;
      }
    } catch (err) {
      // ignore and try next
    }
  }

  if (!html) {
    console.error(`  Could not fetch Liquipedia page for "${displayName}" under slug "${info.slug}"`);
    return false;
  }

  // Find image matches
  const regexPatterns = [
    /\/commons\/images\/thumb\/([0-9a-f]\/[0-9a-f]{2})\/([^\/"]+?_(allmode|lightmode|darkmode|full)\.png)\/[0-9]+px-[^\/"]+?\.png/gi,
    /\/commons\/images\/([0-9a-f]\/[0-9a-f]{2})\/([^\/"]+?_(allmode|lightmode|darkmode|full)\.png)/gi,
    /\/commons\/images\/thumb\/([0-9a-f]\/[0-9a-f]{2})\/([^\/"]+?logo[^\/"]*?\.png)\/[0-9]+px-[^\/"]+?\.png/gi,
    /\/commons\/images\/([0-9a-f]\/[0-9a-f]{2})\/([^\/"]+?logo[^\/"]*?\.png)/gi,
  ];

  let matches = [];
  for (const regex of regexPatterns) {
    let match;
    while ((match = regex.exec(html)) !== null) {
      const relHash = match[1];
      const filename = match[2];
      const imageUrl = `https://liquipedia.net/commons/images/${relHash}/${filename}`;
      if (!matches.includes(imageUrl)) {
        matches.push(imageUrl);
      }
    }
  }

  // Fallback: search for any image in the infobox-image container
  if (matches.length === 0) {
    const infoboxRegex = /<div class="infobox-image"[^>]*>.*?<img[^>]+src="([^"]+)"/is;
    const match = infoboxRegex.exec(html);
    if (match) {
      let imgUrl = match[1];
      if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
      else if (imgUrl.startsWith('/')) imgUrl = 'https://liquipedia.net' + imgUrl;
      
      if (imgUrl.includes('/thumb/')) {
        const cleanParts = imgUrl.replace('/thumb/', '/').split('/');
        cleanParts.pop(); // remove the px- portion
        const reconstructed = cleanParts.join('/');
        matches.push(reconstructed);
      }
      matches.push(imgUrl);
    }
  }

  if (matches.length === 0) {
    console.error(`  No matching images found for "${displayName}"`);
    return false;
  }

  // Filter and pick the best matching logo
  let bestLogo = matches.find(url => url.toLowerCase().includes('allmode'));
  if (!bestLogo) bestLogo = matches.find(url => url.toLowerCase().includes('lightmode'));
  if (!bestLogo) bestLogo = matches.find(url => url.toLowerCase().includes('darkmode'));
  if (!bestLogo) bestLogo = matches[0];

  console.log(`  Selected logo: ${bestLogo}`);

  const originalFileName = `${info.filename}.png`;
  const originalPath = path.join(logoDir, originalFileName);

  try {
    downloadImage(bestLogo, originalPath);
    console.log(`  Successfully downloaded to: ${originalPath}`);

    // Create handy duplicates to support different search variations
    const duplicates = [
      info.filename.replace(/_/g, ' '),       // "team falcons"
      info.filename.replace(/_/g, '-'),       // "team-falcons"
      info.filename.replace(/_/g, ''),        // "teamfalcons"
      displayName.toLowerCase(),              // raw user requested name e.g. "paIN" -> "pain"
      displayName.toLowerCase().replace(/\s+/g, '_'),
      displayName.toLowerCase().replace(/\s+/g, '-'),
      displayName.toLowerCase().replace(/\s+/g, ''),
    ];

    for (const dup of duplicates) {
      const dupFileName = `${dup}.png`;
      const dupPath = path.join(logoDir, dupFileName);
      if (dupPath !== originalPath) {
        fs.copyFileSync(originalPath, dupPath);
      }
    }
    return true;
  } catch (err) {
    console.error(`  Error downloading image for "${displayName}": ${err.message}`);
    return false;
  }
}

async function run() {
  const keys = Object.keys(mappings);
  console.log(`Starting logo downloader for ${keys.length} teams...`);
  
  let successCount = 0;
  for (const key of keys) {
    try {
      const success = await processTeam(key, mappings[key]);
      if (success) successCount++;
      // Wait slightly to prevent hammering
      await new Promise(r => setTimeout(r, 600));
    } catch (e) {
      console.error(`Unhandled error for ${key}: ${e.message}`);
    }
  }
  console.log(`Completed downloading ${successCount}/${keys.length} team logos successfully!`);
}

run();
