import puppeteer from 'puppeteer';

async function testDownload() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    consoleMessages.push(`[pageerror] ${err.toString()}`);
  });
  page.on('dialog', async dialog => {
    consoleMessages.push(`[dialog] ${dialog.type()}: ${dialog.message()}`);
    await dialog.dismiss();
  });

  try {
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 15000 });
    
    // Look for Tournament button / tab
    const buttons = await page.$$('button');
    let tourneyBtn = null;
    for (const b of buttons) {
      const text = await (await b.getProperty('textContent')).jsonValue();
      if (text && (text.includes('ТУРНИР') || text.includes('СЕТКА') || text.includes('Сетки'))) {
        tourneyBtn = b;
        break;
      }
    }
    
    if (tourneyBtn) {
      console.log('Clicking tournament tab...');
      await tourneyBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    }

    // Check if an active tournament exists or open first tournament
    const allButtons = await page.$$('button');
    let downloadBtn = null;
    for (const b of allButtons) {
      const text = await (await b.getProperty('textContent')).jsonValue();
      if (text && text.includes('СКАЧАТЬ СЕТКУ')) {
        console.log('Found СКАЧАТЬ СЕТКУ button directly!');
        downloadBtn = b;
        break;
      }
    }

    if (downloadBtn) {
      await downloadBtn.click();
      await new Promise(r => setTimeout(r, 800));
      // Now check if modal opened
      const modalButtons = await page.$$('button');
      for (const mb of modalButtons) {
        const text = await (await mb.getProperty('textContent')).jsonValue();
        if (text && text.includes('PDF ДОКУМЕНТ')) {
          console.log('Clicking PDF ДОКУМЕНТ in modal...');
          await mb.click();
          await new Promise(r => setTimeout(r, 4000));
          break;
        }
      }
    } else {
      console.log('No СКАЧАТЬ СЕТКУ button visible yet. Let us check page buttons:');
      for (const b of allButtons.slice(0, 15)) {
        const text = await (await b.getProperty('textContent')).jsonValue();
        console.log(' - Button:', text?.trim().slice(0, 40));
      }
    }

    console.log('Console messages:');
    console.log(consoleMessages.join('\n'));

  } catch (e) {
    console.error('Error during test:', e);
  } finally {
    await browser.close();
  }
}

testDownload();
