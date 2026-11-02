/**
 * Cross-tab session messages over a BroadcastChannel. Nothing is persisted: a new tab asks the open tabs for the
 * session, and logouts / token changes are announced to the other tabs of the same account.
 */
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('jb_auth') : null;

export const HANDOFF_TIMEOUT_MS = 250;

export function syncAvailable() {
  return channel !== null;
}

function post(message) {
  try {
    channel?.postMessage(message);
  } catch { /* channel closed */ }
}

/** Resolves with `{ token, user }` from another open tab, or null if none answers in time. */
export function requestSession(timeoutMs = HANDOFF_TIMEOUT_MS) {
  if (!channel) return Promise.resolve(null);
  return new Promise((resolve) => {
    const onMessage = (event) => {
      const msg = event.data;
      if (msg?.type === 'session' && msg.token) finish({ token: msg.token, user: msg.user ?? null });
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    function finish(result) {
      clearTimeout(timer);
      channel.removeEventListener('message', onMessage);
      resolve(result);
    }
    channel.addEventListener('message', onMessage);
    post({ type: 'request-session' });
  });
}

/**
 * Handles messages from other tabs. `getSession` returns this tab's `{ token, user, key }` (or nulls);
 * `onLogout(key)` and `onToken(token, key, user)` are called for announcements about an account.
 */
export function listenForSessionMessages({ getSession, onLogout, onToken }) {
  if (!channel) return () => {};
  const onMessage = (event) => {
    const msg = event.data;
    if (!msg?.type) return;
    if (msg.type === 'request-session') {
      const { token, user } = getSession();
      if (token) post({ type: 'session', token, user });
    } else if (msg.type === 'logout') {
      onLogout(msg.key);
    } else if (msg.type === 'token' && msg.token) {
      onToken(msg.token, msg.key, msg.user ?? null);
    }
  };
  channel.addEventListener('message', onMessage);
  return () => channel.removeEventListener('message', onMessage);
}

export function announceLogout(key) {
  if (key) post({ type: 'logout', key });
}

export function announceToken(token, key, user = null) {
  if (token && key) post({ type: 'token', token, key, user });
}
