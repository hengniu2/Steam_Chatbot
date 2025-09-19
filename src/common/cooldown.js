
export class CooldownTracker {
  constructor() {
    this.lastMap = new Map(); // key -> timestamp (ms)
  }

  isReady(key, cooldownMs) {
    const last = this.lastMap.get(key) || 0;
    return Date.now() - last >= cooldownMs;
  }

  msRemaining(key, cooldownMs) {
    const last = this.lastMap.get(key) || 0;
    const delta = Date.now() - last;
    return Math.max(0, cooldownMs - delta);
  }

  mark(key) {
    this.lastMap.set(key, Date.now());
  }
}
