// Very small in-memory session store.
// Keys are the sender's phone number, value is their last set of search
// results plus an expiry time, so "reply with a number" only works for a
// little while after a search.
//
// This resets whenever the server restarts. That's fine for a personal,
// single-user tool. If you ever need it to survive restarts, swap this out
// for a tiny SQLite file instead of a Map.

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes

const sessions = new Map();

function saveResults(phone, results) {
  sessions.set(phone, {
    results,
    expires: Date.now() + SESSION_TTL_MS,
  });
}

function getResults(phone) {
  const entry = sessions.get(phone);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    sessions.delete(phone);
    return null;
  }
  return entry.results;
}

module.exports = { saveResults, getResults };
