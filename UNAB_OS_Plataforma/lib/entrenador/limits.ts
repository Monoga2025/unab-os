// Shared bounds for the Entrenador chat. Kept in a tiny standalone module so
// client and server agree without pulling the large system prompt into the
// browser bundle.

/** Prior turns included in a bridge prompt. */
export const MAX_HISTORY_TURNS = 12;

/** Largest history array the API accepts (it is later trimmed to `MAX_HISTORY_TURNS`). */
export const MAX_API_HISTORY_ENTRIES = 40;
