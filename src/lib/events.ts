/**
 * Simple event emitter for cross-component communication
 */

type EventCallback = (...args: unknown[]) => void;

const listeners: Record<string, EventCallback[]> = {};

export const appEvents = {
  on(event: string, callback: EventCallback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
    return () => {
      listeners[event] = listeners[event].filter(cb => cb !== callback);
    };
  },

  emit(event: string, ...args: unknown[]) {
    if (listeners[event]) {
      listeners[event].forEach(cb => cb(...args));
    }
  },

  off(event: string, callback: EventCallback) {
    if (listeners[event]) {
      listeners[event] = listeners[event].filter(cb => cb !== callback);
    }
  },
};

// Event names
export const EVENTS = {
  OPEN_SHIP_LIGHTBOX: 'open-ship-lightbox',
  OPEN_TRACK_LIGHTBOX: 'open-track-lightbox',
} as const;
