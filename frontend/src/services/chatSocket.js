import { authStorage } from './authStorage';
import { API_BASE_URL } from './api';

const WS_URL = `${API_BASE_URL.replace(/^http/, 'ws')}/ws/chat`;

class ChatSocket {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.reconnectTimer = null;
    this.connected = false;
  }

  connect() {
    const token = authStorage.getToken();
    if (!token) {
      this.disconnect();
      return;
    }
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

    this.ws.onopen = () => {
      this.connected = true;
      this.emitStatus();
    };

    this.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'NEW_MESSAGE' && payload.data) {
          this.listeners.forEach((fn) => fn(payload.data));
        }
      } catch {
        // ignore malformed payloads
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.emitStatus();
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.emitStatus();
  }

  scheduleReconnect() {
    if (this.reconnectTimer || !authStorage.getToken()) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2000);
  }

  onMessage(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  onStatus(callback) {
    this.statusListeners = this.statusListeners || new Set();
    this.statusListeners.add(callback);
    callback(this.connected);
    return () => this.statusListeners.delete(callback);
  }

  emitStatus() {
    this.statusListeners?.forEach((fn) => fn(this.connected));
  }

  isConnected() {
    return this.connected;
  }
}

export const chatSocket = new ChatSocket();
