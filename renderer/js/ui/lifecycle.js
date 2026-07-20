let currentRoute = null;
let epoch = 0;
const cleanupFns = new Set();

export function setCurrentRoute(route) {
  const changed = currentRoute !== route;
  currentRoute = route;
  epoch++;
  for (const fn of cleanupFns) { try { fn(); } catch {} }
  cleanupFns.clear();
  if (changed) {
    document.querySelectorAll('.modal-backdrop').forEach((b) => b.remove());
  }
}

export function getCurrentRoute() { return currentRoute; }
export function getEpoch() { return epoch; }

export function isCurrent(route, capturedEpoch) {
  if (capturedEpoch != null) return capturedEpoch === epoch;
  return currentRoute === route;
}

export function registerCleanup(fn) {
  cleanupFns.add(fn);
  return () => cleanupFns.delete(fn);
}

export function pageInterval(cb, ms) {
  const id = setInterval(cb, ms);
  registerCleanup(() => clearInterval(id));
  return id;
}

export function pageTimeout(cb, ms) {
  const id = setTimeout(cb, ms);
  registerCleanup(() => clearTimeout(id));
  return id;
}
