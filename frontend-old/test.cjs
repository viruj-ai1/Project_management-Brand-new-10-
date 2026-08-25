const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR LOG:', msg.text());
  });
  page.on('pageerror', error => console.log('PAGE ERROR EXCEPTION:', error.message));
  
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  await page.goto(appUrl);
  await new Promise(r => setTimeout(r, 2000));
  
  await page.type('input[type="text"]', 'u3');
  await page.type('input[type="password"]', 'PMA@Virujgroup');
  await page.click('button[type="submit"]');
  
  await new Promise(r => setTimeout(r, 2000));
  
  const projectCards = await page.$$('.bg-white.rounded-2xl');
  if (projectCards.length > 0) {
     await projectCards[1].click();
  }
  
  await new Promise(r => setTimeout(r, 2000));
  
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Assign New Task')) {
      await btn.click();
      console.log('Clicked Assign New Task');
      break;
    }
  }
  
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
