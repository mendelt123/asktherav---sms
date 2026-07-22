# AskTheRav SMS Gateway

Text a question to a phone number, get back a numbered list of matching
questions from AskTheRav.com, reply with a number, get the full answer
texted to you.

## How it works

1. You text your question to a Twilio phone number.
2. Twilio forwards it (via webhook) to this server.
3. The server opens a headless browser, types your question into
   AskTheRav's real search box, and reads back the list of results.
4. It texts you the titles, numbered.
5. You reply with a number.
6. The server fetches that page and texts you back the title + full answer
   text.

## 1. Get a Twilio account and phone number

1. Go to twilio.com and sign up (free trial works for testing; you'll need
   a paid account with a small balance for ongoing real use - texting costs
   roughly a cent or two per message).
2. In the Twilio console, buy an SMS-capable phone number
   (Phone Numbers -> Buy a Number). This is the number you'll text.
3. Note your number - you'll point it at your server in step 4.

You do **not** need your Account SID or Auth Token for this basic setup,
since we only receive and reply to messages via webhook (Twilio handles the
outbound reply automatically through the same webhook response).

## 2. Install and run locally (to test)

```bash
cd asktherav-sms
npm install
npm start
```

This starts the server on port 3000. Puppeteer will download a bundled
Chromium the first time you run `npm install` - that's expected and can
take a minute.

To let Twilio reach your local machine while testing, use a tunnel like
[ngrok](https://ngrok.com):

```bash
ngrok http 3000
```

Copy the `https://xxxx.ngrok.app` URL it gives you.

## 3. Point Twilio at your server

In the Twilio console:
- Go to your phone number's configuration page.
- Under "A message comes in", set the webhook to:
  `https://xxxx.ngrok.app/sms` (or your real server URL once deployed)
  Method: `HTTP POST`
- Save.

Text your Twilio number a question and you should get a reply within a
few seconds (the headless browser step takes a couple of seconds).

## 4. Deploy somewhere permanent

For everyday use you'll want this running on a server that's always on,
not your laptop. A few reasonable options:

- **Render.com** or **Railway.app** - both support Node + Puppeteer with a
  small paid plan (Puppeteer needs more memory than typical free tiers
  allow, so budget for their smallest paid tier, a few dollars/month).
- **A small VPS** (e.g. a $5/month DigitalOcean droplet) - most flexible,
  a bit more setup (installing Node, Chromium dependencies, a process
  manager like `pm2`).

Once deployed, update the Twilio webhook URL to point at the permanent
`https://your-app-url/sms` instead of the ngrok URL.

## Notes and known limitations

- **Search selectors may need a small tweak.** AskTheRav's search results
  load in via JavaScript, so this uses a real headless browser to type into
  the search box, the same way you would. The code in `lib/search.js` finds
  the search box and reads back results using best-effort selectors. If you
  ever get "No results found" for questions that clearly have answers on
  the site, open `https://asktherav.com/search/` in a normal browser,
  press F12 -> Elements, and check whether the search `<input>` still
  matches one of the selectors listed near the top of `lib/search.js`.
  Update that list if needed.
- **Session memory is temporary.** Your last search results are kept in
  memory for 15 minutes so "reply with a number" works. If you wait longer
  than that, or the server restarts, you'll need to text your question
  again.
- **Long answers get truncated** to keep texts a reasonable length. Reply
  `link` after a truncated answer to get the full page URL for that
  search's results.
- **This is for personal use.** It automates a real user interaction with
  the site's own search box rather than hitting any private API, but it's
  still worth keeping usage light (i.e., don't hammer it with rapid
  automated queries) and being mindful of AskTheRav's terms of use.
