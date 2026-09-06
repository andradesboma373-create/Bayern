import fs from 'fs';
import path from 'path';
import https from 'https';

const BASE_URL = 'https://raw.githubusercontent.com/Juknum/counter-strike-icons/main/cs2/panorama/images/tournaments/teams/';

const FILES = [
  "3dm.svg", "ad.svg", "amka.svg", "apex.svg", "astr.svg", "aura.svg", "avg.svg", "b8.svg",
  "bb.svg", "bes.svg", "big.svg", "bne.svg", "bravg.svg", "c9.svg", "c9g.svg", "center_icon.svg",
  "chin.svg", "clg.svg", "cm.svg", "col.svg", "cope.svg", "cplx.svg", "cr4z.svg", "cw.svg",
  "dat.svg", "dig.svg", "drea.svg", "e6ten.svg", "ebet.svg", "ecst.svg", "ence.svg", "ent.svg",
  "eps.svg", "esc.svg", "eter.svg", "evl.svg", "fal.svg", "faze.svg", "flg.svg", "flip.svg",
  "flux.svg", "fntc.svg", "forz.svg", "fq.svg", "furi.svg", "fut.svg", "g2.svg", "gaim.svg",
  "gamb.svg", "gl.svg", "god.svg", "gray.svg", "hero.svg", "hlr.svg", "huns.svg", "ibp.svg",
  "ihc.svg", "im.svg", "imp.svg", "imt.svg", "indw.svg", "intz.svg", "itb.svg", "keyd.svg",
  "king.svg", "koi.svg", "lc.svg", "ldlc.svg", "lgb.svg", "lgcy.svg", "liq.svg", "lumi.svg",
  "lumik.svg", "lynn.svg", "m80.svg", "meti.svg", "mfg.svg", "mibr.svg", "mngz.svg", "mont.svg",
  "mouz.svg", "mss.svg", "myxmg.svg", "navi.svg", "nein.svg", "nemi.svg", "nf.svg", "nine.svg",
  "nip.svg", "nipta.svg", "niptb.svg", "nologo.svg", "nor.svg", "nrg.svg", "nv.svg", "og.svg",
  "optc.svg", "orbit.svg", "out.svg", "pain.svg", "pand.svg", "pari.svg", "penta.svg", "pkd.svg",
  "psnu.svg", "qb.svg", "r.svg", "ratm.svg", "redc.svg", "ren.svg", "rgg.svg", "ride.svg",
  "rog.svg", "saw.svg", "shrk.svg", "sinn.svg", "sk.svg", "spc.svg", "spir.svg", "splc.svg",
  "spr.svg", "steu.svg", "stus.svg", "syma.svg", "thun.svg", "thv.svg", "tit.svg", "tsm.svg",
  "tsolo.svg", "tyl.svg", "us.svg", "v.svg", "v2.svg", "ve.svg", "vega.svg", "vex.svg",
  "vg.svg", "vici.svg", "vita.svg", "vp.svg", "wcrd.svg", "wgg.svg", "wins.svg", "xapso.svg", "zzn.svg"
];

const TARGET_DIRS = [
  path.resolve('./public/logos'),
  path.resolve('./dist/logos')
];

TARGET_DIRS.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function downloadFile(fileName) {
  return new Promise((resolve) => {
    const url = BASE_URL + fileName;
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        console.warn(`Failed to download ${fileName}: status ${res.statusCode}`);
        resolve(false);
        return;
      }
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        TARGET_DIRS.forEach(dir => {
          fs.writeFileSync(path.join(dir, fileName), buffer);
        });
        resolve(true);
      });
    }).on('error', (err) => {
      console.error(`Error downloading ${fileName}:`, err.message);
      resolve(false);
    });
  });
}

async function main() {
  console.log(`Starting download of ${FILES.length} team SVG logos...`);
  let successCount = 0;
  
  // Download in chunks of 10 concurrent requests
  const CHUNK_SIZE = 10;
  for (let i = 0; i < FILES.length; i += CHUNK_SIZE) {
    const batch = FILES.slice(i, i + CHUNK_SIZE);
    const results = await Promise.all(batch.map(file => downloadFile(file)));
    successCount += results.filter(Boolean).length;
    process.stdout.write(`Downloaded ${successCount}/${FILES.length}...\r`);
  }
  
  console.log(`\nSuccessfully downloaded ${successCount} SVGs into public/logos and dist/logos.`);
}

main();
