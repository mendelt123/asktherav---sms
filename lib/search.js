// Uses a real (headless) browser to type a question into AskTheRav's search
// box, the same way you would on the site, and reads back the resulting
// list of matching questions/articles.
//
// NOTE: The site's search results load in via JavaScript, so this can't be
// done with a plain HTTP request - it needs an actual browser. The
// selectors below are a best-effort guess based on the site's structure.
// If searches start coming back empty, open https://asktherav.com/search/
// in a desktop browser, press F12 -> Elements, type a test question, and:
//   1. Find the <input> the search box uses -> update SEARCH_INPUT_SELECTORS
//   2. Find the container that the result links appear in -> you likely
//      won't need to change RESULT_LINK_PATTERN, since it matches on the
//      URL shape (e.g. /12345-some-question/ or /article-123-some-title/)
//      rather than on CSS classes, which tends to be more stable.

const puppeteer = require('puppeteer');

const SEARCH_URL = 'https://asktherav.com/search/';

const SEARCH_INPUT_SELECTORS = [
  'input[type="search"]',
  'input.search-field',
  'input[name="q"]',
  'input#search-input',
  'input[placeholder*="Search" i]',
];

// Matches permalink shapes seen on the site, e.g.
//   https://asktherav.com/10196-can-children-eat-fleishigs.../
//   https://asktherav.com/article-629-the-case-of-milk-in-the-sugar-bowl/
const RESULT_LINK_PATTERN = /asktherav\.com\/(article-)?\d+-/;

async function findSearchInput(page) {
  for (const selector of SEARCH_INPUT_SELECTORS) {
    const el = await page.$(selector);
    if (el) return selector;
  }
  throw new Error(
    'Could not find the search input on asktherav.com/search/. ' +
      'The page markup may have changed - see the note at the top of lib/search.js.'
  );
}

async function searchAskTheRav(query, { maxResults = 8 } = {}) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36'
    );
    await page.goto(SEARCH_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    const inputSelector = await findSearchInput(page);
    await page.click(inputSelector);
    await page.type(inputSelector, query, { delay: 15 });
    await page.keyboard.press('Enter');

    // Wait for the "Searching..." placeholder to disappear, then give the
    // results a moment to settle in the DOM.
    await page
      .waitForFunction(
        () => !document.body.innerText.includes('Searching...'),
        { timeout: 15000 }
      )
      .catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const results = await page.evaluate((patternSource) => {
      const pattern = new RegExp(patternSource);
      const seen = new Set();
      const items = [];
      document.querySelectorAll('a[href]').forEach((a) => {
        const href = a.getAttribute('href') || '';
        const text = a.textContent.trim();
        if (!text || !pattern.test(href) || seen.has(href)) return;
        seen.add(href);
        items.push({ title: text, url: href });
      });
      return items;
    }, RESULT_LINK_PATTERN.source);

    return results.slice(0, maxResults);
  } finally {
    await browser.close();
  }
}

module.exports = { searchAskTheRav };
