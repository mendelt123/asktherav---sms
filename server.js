require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const { searchAskTheRav } = require('./lib/search');
const { fetchAnswer } = require('./lib/fetchAnswer');
const { saveResults, getResults } = require('./lib/sessionStore');

const { MessagingResponse } = twilio.twiml;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Keep replies well under the length where carriers start dropping or
// mangling very long concatenated texts.
const MAX_SMS_CHARS = 1400;

app.post('/sms', async (req, res) => {
  const from = req.body.From;
  const body = (req.body.Body || '').trim();
  const twiml = new MessagingResponse();

  try {
    if (/^\d+$/.test(body)) {
      // User replied with a number -> they're picking a result from their
      // last search.
      const results = getResults(from);
      const index = parseInt(body, 10) - 1;

      if (!results) {
        twiml.message("I don't have an active search for you. Text me a question first.");
      } else if (index < 0 || index >= results.length) {
        twiml.message(`Please reply with a number between 1 and ${results.length}.`);
      } else {
        const chosen = results[index];
        const { title, body: answerBody } = await fetchAnswer(chosen.url);
        let reply = answerBody ? `${title}\n\n${answerBody}` : title;
        if (reply.length > MAX_SMS_CHARS) {
          reply = `${reply.slice(0, MAX_SMS_CHARS)}…\n(truncated - reply "link" for the full page URL)`;
        }
        twiml.message(reply);
      }
    } else if (body.toLowerCase() === 'link') {
      // Convenience: text "link" after reading a truncated answer to get
      // the URL for the full page.
      const results = getResults(from);
      twiml.message(
        results && results.length
          ? results.map((r, i) => `${i + 1}. ${r.url}`).join('\n')
          : "I don't have an active search for you. Text me a question first."
      );
    } else if (!body) {
      twiml.message('Text me a halacha question and I will search AskTheRav for you.');
    } else {
      // New question -> run the search.
      const results = await searchAskTheRav(body);

      if (!results.length) {
        twiml.message('No results found on AskTheRav. Try rephrasing your question.');
      } else {
        saveResults(from, results);
        const list = results.map((r, i) => `${i + 1}. ${r.title}`).join('\n');
        twiml.message(`Results for "${body}":\n\n${list}\n\nReply with a number for the full answer.`);
      }
    }
  } catch (err) {
    console.error('Error handling SMS:', err);
    twiml.message('Something went wrong searching AskTheRav. Please try again in a moment.');
  }

  res.type('text/xml').send(twiml.toString());
});

app.get('/health', (req, res) => res.send('ok'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AskTheRav SMS gateway listening on port ${PORT}`));
