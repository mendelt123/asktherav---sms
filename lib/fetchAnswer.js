// Fetches a single question/article page and extracts the title + answer
// text. Unlike search, these pages render their content straight into the
// HTML, so a plain HTTP request + cheerio (jQuery-like HTML parsing) is
// enough here - no headless browser needed.

const axios = require('axios');
const cheerio = require('cheerio');

const BODY_SELECTORS = ['.entry-content', 'article .content', '.post-content', 'main article', 'main'];

async function fetchAnswer(url) {
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AskTheRavSMS/1.0)' },
    timeout: 15000,
  });

  const $ = cheerio.load(data);

  const title = $('h1').first().text().trim() || $('title').text().trim();

  let body = '';
  for (const selector of BODY_SELECTORS) {
    const el = $(selector).first();
    const text = el.text().trim();
    if (text.length > 40) {
      body = text;
      break;
    }
  }

  body = body
    .replace(/\r/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { title, body };
}

module.exports = { fetchAnswer };
