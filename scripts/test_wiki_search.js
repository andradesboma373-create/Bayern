import { execSync } from 'child_process';

const teams = [
  "Falcons",
  "Vitality",
  "Spirit",
  "FURIA",
  "Natus Vincere",
  "9z",
  "Aurora",
  "G2",
  "BetBoom",
  "MOUZ",
  "FaZe",
  "Astralis",
  "Virtus pro",
  "Fnatic",
  "Team Liquid",
];

function searchWikipediaLogo(teamName) {
  const query = `${teamName} logo`;
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=imageinfo&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&iiprop=url&gsrlimit=10`;
  
  try {
    const resText = execSync(`curl -s "${url}"`, { encoding: 'utf8' });
    const data = JSON.parse(resText);
    
    if (!data.query || !data.query.pages) {
      console.log(`No results for "${teamName}"`);
      return null;
    }
    
    const pages = Object.values(data.query.pages);
    // Filter pages that are images and match the team name
    const matches = pages.filter(p => {
      const title = p.title.toLowerCase();
      const isImg = title.endsWith('.png') || title.endsWith('.svg') || title.endsWith('.jpg') || title.endsWith('.jpeg') || title.endsWith('.webp');
      const hasLogo = title.includes('logo');
      const nameParts = teamName.toLowerCase().split(/\s+/);
      const matchesName = nameParts.some(part => part.length > 2 && title.includes(part));
      return isImg && hasLogo && matchesName;
    });
    
    if (matches.length > 0) {
      // Prioritize SVG, then PNG
      matches.sort((a, b) => {
        const aSvg = a.title.toLowerCase().endsWith('.svg') ? 1 : 0;
        const bSvg = b.title.toLowerCase().endsWith('.svg') ? 1 : 0;
        return bSvg - aSvg;
      });
      
      const best = matches[0];
      const imgUrl = best.imageinfo && best.imageinfo[0] ? best.imageinfo[0].url : null;
      console.log(`Match for "${teamName}": ${best.title} -> ${imgUrl}`);
      return imgUrl;
    } else {
      console.log(`No matching image for "${teamName}" (found ${pages.length} total files)`);
      return null;
    }
  } catch (err) {
    console.error(`Error searching for ${teamName}: ${err.message}`);
    return null;
  }
}

for (const team of teams) {
  searchWikipediaLogo(team);
}
