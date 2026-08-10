const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to proposal...');
  await page.goto('http://localhost:3000/p/acme-corp-4u729ec', { waitUntil: 'networkidle' });

  console.log('Opening PDF Configuration Modal...');
  await page.click('button:has-text("Configure & Print PDF")');
  
  // Wait for modal to appear
  await page.waitForSelector('text="PDF Print Settings"');

  console.log('Configuring settings...');
  // 1. Hide line-item prices
  await page.check('label:has-text("Hide Line-Item Prices") input[type="checkbox"]');
  // 2. Hide Optional Add-ons
  await page.uncheck('label:has-text("Optional Add-ons") input[type="checkbox"]');
  // 3. Set Page Numbers to bottom-right
  const selects = await page.$$('select');
  await selects[0].selectOption('bottom-right'); // Page numbers

  // 4. Set Custom Header
  await page.fill('input[placeholder*="Proposal"]', 'Confidential - Acme Corp');

  // 5. Ink-Saving Mode
  await page.check('label:has-text("Ink-Saving Mode") input[type="checkbox"]');

  console.log('Settings applied. Mocking window.print()...');
  // We don't want window.print to actually hang the browser, but we just want to close the modal and let state apply
  await page.evaluate(() => {
    window.print = () => console.log('window.print intercepted');
  });

  await page.click('button:has-text("Apply & Print")');
  
  // Wait a bit for React to re-render
  await page.waitForTimeout(1000);

  // Print to PDF
  const pdfPath = '/Users/sahilbagul/Desktop/s/Invictus/SaaS (Proposal) /proposal-app/acme-proposal-configured.pdf';
  console.log(`Generating PDF to ${pdfPath}...`);
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true, // we need backgrounds to test ink saving mode effectively
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    displayHeaderFooter: false // We are rendering our own custom headers/footers in the DOM!
  });

  console.log(`PDF successfully generated: ${pdfPath}`);
  
  // Also dump the title to verify Bug 2
  const title = await page.title();
  console.log(`Page <title> is: "${title}"`);

  await browser.close();
})();
