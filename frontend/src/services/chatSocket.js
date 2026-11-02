import { authStorage } from './authStorage';
import api, { API_BASE_URL, unwrap } from './api';

const WS_URL = `${API_BASE_URL.replace(/^http/, 'ws')}/ws/chat`;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
// Server closes with 1003 (NOT_ACCEPTABLE) or 1008 (policy) when the session is not allowed; retrying won't help.
const FATAL_CLOSE_CODES = new Set([1003, 1008]);

export function reconnectDelay(attempt) {
  return Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt);
}

/**
 * Browsers can't send headers on a WebSocket handshake, so instead of putting the JWT in the URL (where proxies
 * log it) each connection uses a short-lived, single-use ticket fetched over the authenticated REST API.
 */
async function fetchTicket() {
  const res = await api.post('/api/messages/ws-ticket');
  return unwrap(res)?.ticket;
}

class ChatSocket {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.connected = false;
    this.connecting = false;
    this.generation = 0;
  }

  async connect() {
    if (!authStorage.getToken()) {
      this.disconnect();
      return;
    }
    if (this.connecting) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const generation = this.generation;
    this.connecting = true;
    let ticket;
    try {
      ticket = await fetchTicket();
    } catch (err) {
      this.connecting = false;
      // A 401 means the session is over (the API interceptor handles it); anything else is worth retrying.
      if (generation === this.generation && err.response?.status !== 401) this.scheduleReconnect();
      return;
    }
    this.connecting = false;
    if (generation !== this.generation || !ticket || !authStorage.getToken()) return;

    const ws = new WebSocket(`${WS_URL}?ticket=${encodeURIComponent(ticket)}`);
    this.ws = ws;

    ws.onopen = () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emitStatus();
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'NEW_MESSAGE' && payload.data) {
          this.listeners.forEach((fn) => fn(payload.data));
        }
      } catch {
        // ignore malformed payloads
      }
    };

    ws.onclose = (event) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.connected = false;
      this.emitStatus();
      if (!FATAL_CLOSE_CODES.has(event?.code)) this.scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  disconnect() {
    this.generation += 1;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.connecting = false;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.emitStatus();
  }

  reconnect() {
    this.disconnect();
    this.connect();
  }

  scheduleReconnect() {
    if (this.reconnectTimer || !authStorage.getToken()) return;
    const delay = reconnectDelay(this.reconnectAttempts);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  onMessage(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  onStatus(callback) {
    this.statusListeners.add(callback);
    callback(this.connected);
    return () => this.statusListeners.delete(callback);
  }

  emitStatus() {
    this.statusListeners.forEach((fn) => fn(this.connected));
  }

  isConnected() {
    return this.connected;
  }
}

export const chatSocket = new ChatSocket();
