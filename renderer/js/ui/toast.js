let toastRoot = null;

function ensureRoot() {
  if (toastRoot && document.body.contains(toastRoot)) return toastRoot;
  toastRoot = document.createElement('div');
  toastRoot.className = 'toast-root';
  document.body.appendChild(toastRoot);
  return toastRoot;
}

export function toast({ title, body, kind = 'info', duration = 4200, notify = true }) {
  const root = ensureRoot();
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.innerHTML = `
    <div class="toast-icon"><i class="fa-solid ${kind === 'ok' ? 'fa-circle-check' : kind === 'fail' ? 'fa-circle-xmark' : kind === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-info'}"></i></div>
    <div class="toast-body">
      <div class="toast-title">${title || ''}</div>
      ${body ? `<div class="toast-desc">${body}</div>` : ''}
    </div>
    <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
  `;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast-in'));

  const remove = () => {
    el.classList.remove('toast-in');
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 200);
  };
  el.querySelector('.toast-close').addEventListener('click', remove);
  const timer = setTimeout(remove, duration);
  el.addEventListener('mouseenter', () => clearTimeout(timer));

  if (notify) {
    try { window.cobalt.notify({ title, body: body ? body.replace(/<[^>]+>/g, '') : '' }); } catch {}
  }
}

function installGlobalEscape() {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const backdrops = document.querySelectorAll('.modal-backdrop');
    if (backdrops.length) backdrops[backdrops.length - 1].remove();
  });
}

export function installErrorHandler() {
  installGlobalEscape();
  window.addEventListener('error', (e) => {
    console.error('Global error:', e.error || e.message);
    try {
      toast({
        title: 'Unexpected error',
        body: (e.error && e.error.message) || e.message || 'Unknown error',
        kind: 'fail',
        notify: false,
      });
    } catch {}
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled rejection:', e.reason);
    try {
      toast({
        title: 'Operation failed',
        body: (e.reason && e.reason.message) || String(e.reason) || 'Unknown error',
        kind: 'fail',
        notify: false,
      });
    } catch {}
  });
}
