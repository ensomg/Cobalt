const { runPS, runPSJson } = require('./ps');

const KNOWN_PLANS = {
  '381b4222-f694-41f0-9685-ff5bb260df2e': { name: 'Balanced',              desc: 'Default Windows plan. Balances performance and energy use.', icon: 'fa-scale-balanced' },
  '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c': { name: 'High Performance',      desc: 'Full CPU turbo, minimal throttling. Higher power draw.',     icon: 'fa-bolt' },
  'a1841308-3541-4fab-bc81-f71556f20b4a': { name: 'Power Saver',           desc: 'Reduces CPU frequency to save battery.',                     icon: 'fa-leaf' },
  'e9a42b02-d5df-448d-aa00-03f14749eb61': { name: 'Ultimate Performance',  desc: 'Zero throttling. For high-end desktops and workstations.',   icon: 'fa-rocket' },
};

async function listPlans() {
  const script = `powercfg /list | Out-String`;
  const raw = await runPS(script, { timeoutMs: 8000 });
  const plans = [];
  const rx = /Power Scheme GUID:\s*([0-9a-f-]+)\s*\(([^)]+)\)(\s*\*)?/gi;
  let m;
  while ((m = rx.exec(raw)) !== null) {
    const guid = m[1].toLowerCase();
    const name = m[2].trim();
    const active = !!m[3];
    const known = KNOWN_PLANS[guid] || { name, desc: 'Custom or OEM power plan.', icon: 'fa-plug' };
    plans.push({ guid, name: known.name || name, desc: known.desc, icon: known.icon, active });
  }
  return plans;
}

async function setPlan(guid) {
  await runPS(`powercfg -setactive ${guid}`, { timeoutMs: 8000 });
  return { ok: true };
}

async function enableUltimate() {
  const raw = await runPS('powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>&1', { timeoutMs: 8000 });
  const m = raw.match(/([0-9a-f-]{36})/i);
  if (m) return { ok: true, guid: m[1].toLowerCase() };
  return { ok: false, error: 'Could not create Ultimate plan' };
}

module.exports = { listPlans, setPlan, enableUltimate, KNOWN_PLANS };
