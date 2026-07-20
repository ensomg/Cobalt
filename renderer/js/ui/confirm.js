export function confirmDialog({ title, body, confirmLabel = 'Continue', cancelLabel = 'Cancel', danger = false, restorePoint = false }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" style="width: min(520px, 92vw)">
        <div class="modal-head">
          <div class="hw-icon" style="${danger ? 'background:rgba(224,138,138,0.15); color:var(--crit)' : 'color:var(--accent)'}"><i class="fa-solid ${danger ? 'fa-triangle-exclamation' : 'fa-circle-info'}"></i></div>
          <div style="flex:1">
            <div class="modal-title">${title}</div>
          </div>
        </div>
        <div class="modal-body" style="font-size:13px; color:var(--text-dim); line-height:1.6">
          <div>${body}</div>
          ${restorePoint ? `
            <label class="opt-item" style="margin-top: 18px; cursor: pointer">
              <input type="checkbox" id="createRP" checked />
              <div class="opt-body">
                <div class="opt-title">Create System Restore Point first</div>
                <div class="opt-desc">Recommended. Adds 10-30 seconds. You can revert changes via Windows Recovery.</div>
              </div>
            </label>
          ` : ''}
          <div style="display:flex; gap:8px; margin-top: 18px; justify-content: flex-end">
            <button class="btn ghost" id="cancelBtn">${cancelLabel}</button>
            <button class="btn ${danger ? 'primary' : 'primary'}" id="confirmBtn">${confirmLabel}</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const finish = (result) => {
      backdrop.remove();
      resolve(result);
    };

    backdrop.querySelector('#cancelBtn').addEventListener('click', () => finish({ confirmed: false }));
    backdrop.querySelector('#confirmBtn').addEventListener('click', () => {
      const rp = backdrop.querySelector('#createRP');
      finish({ confirmed: true, createRestorePoint: rp ? rp.checked : false });
    });
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) finish({ confirmed: false }); });
    const esc = (e) => { if (e.key === 'Escape') { finish({ confirmed: false }); document.removeEventListener('keydown', esc); } };
    document.addEventListener('keydown', esc);
  });
}

export async function withRestorePoint({ description, run, notifyTitle, notifyBody }) {
  const rpRes = await window.cobalt.createRestorePoint(description);
  const result = await run();
  try {
    window.cobalt.notify({
      title: notifyTitle || 'Cobalt',
      body: notifyBody || (rpRes.ok ? 'Task completed. Restore point created.' : 'Task completed.'),
    });
  } catch {}
  return { ...result, restorePoint: rpRes };
}
