const TOKEN_KEY = 'accounting_token';
const USER_KEY = 'accounting_user';

export const authSession = {
  token: () => sessionStorage.getItem(TOKEN_KEY),
  user: () => {
    try {
      const stored = sessionStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },
  save: (token, user) => {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  },
};

export function createAuthTabBridge({ onSession, onClear, onReady }) {
  if (!('BroadcastChannel' in window)) {
    onReady?.();
    return null;
  }

  const channel = new BroadcastChannel('mdr-accounting-auth');
  const requestId = crypto.randomUUID();
  let ready = Boolean(authSession.token() && authSession.user());
  let readyTimer = null;

  const finishReady = () => {
    if (readyTimer) window.clearTimeout(readyTimer);
    if (!ready) ready = true;
    onReady?.();
  };

  channel.onmessage = event => {
    const message = event.data;
    if (!message || typeof message !== 'object') return;

    if (message.type === 'session-request') {
      const token = authSession.token();
      const user = authSession.user();
      if (token && user) channel.postMessage({ type: 'session-response', requestId: message.requestId, token, user });
      return;
    }

    if (message.type === 'session-response' && message.requestId === requestId && message.token && message.user) {
      authSession.save(message.token, message.user);
      onSession?.(message.user);
      finishReady();
      return;
    }

    if (message.type === 'session-updated' && message.token && message.user) {
      authSession.save(message.token, message.user);
      onSession?.(message.user);
      finishReady();
      return;
    }

    if (message.type === 'session-cleared') {
      authSession.clear();
      onClear?.();
      finishReady();
    }
  };

  if (ready) {
    onReady?.();
  } else {
    channel.postMessage({ type: 'session-request', requestId });
    // Keep the login screen from flashing while an existing tab responds.
    readyTimer = window.setTimeout(finishReady, 350);
  }

  return {
    announce: (token, user) => channel.postMessage({ type: 'session-updated', token, user }),
    announceClear: () => channel.postMessage({ type: 'session-cleared' }),
    close: () => {
      if (readyTimer) window.clearTimeout(readyTimer);
      channel.close();
    },
  };
}
