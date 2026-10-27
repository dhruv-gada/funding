// ─────────────────────────────────────────────────────────────
// SIMPLE PASSWORD GATE
// Keeps casual visitors out. It is NOT real security: anyone who reads
// the page source can bypass it, and data/*.json is public on GitHub.
// The password is stored only as a SHA-256 hash.
// To change it: echo -n "newpassword" | sha256sum  → paste below.
// ─────────────────────────────────────────────────────────────
(function () {
  const PASS_HASH = "24ad21ec0e4d4bb1e6d638384bdb97843ddfe767d4aa0f675ea640676b0fde48";
  const KEY = "fr_auth";
  const root = document.documentElement;

  function store() {
    try { return window.localStorage; } catch (e) { return null; }
  }
  function isAuthed() {
    try { return store() && store().getItem(KEY) === PASS_HASH; } catch (e) { return false; }
  }

  if (!isAuthed()) root.classList.add("locked");

  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function buildGate() {
    const gate = document.createElement("div");
    gate.id = "authGate";
    gate.innerHTML = `
      <form class="auth-card" autocomplete="on">
        <div class="auth-mark">
          <svg width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="24" cy="24" r="23" stroke="#4E3629" stroke-width="2"/>
            <path d="M14 24 Q19 14 24 24 Q29 34 34 24" stroke="#4E3629" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <path d="M14 19 Q19 9 24 19 Q29 29 34 19" stroke="#C41E3A" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.55"/>
            <path d="M14 29 Q19 19 24 29 Q29 39 34 29" stroke="#C41E3A" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.55"/>
          </svg>
        </div>
        <h1>FundingRadar</h1>
        <p class="auth-sub">Tripathi Lab · Brown University</p>
        <label for="authPass">Password</label>
        <input id="authPass" type="password" autocomplete="current-password" required autofocus />
        <p class="auth-err" id="authErr" role="alert"></p>
        <button type="submit">Enter</button>
      </form>`;
    document.body.appendChild(gate);

    const form = gate.querySelector("form");
    const input = gate.querySelector("#authPass");
    const err = gate.querySelector("#authErr");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.textContent = "";
      let ok = false;
      try { ok = (await sha256(input.value)) === PASS_HASH; }
      catch (x) { err.textContent = "This browser can't check the password. Try opening the site over https."; return; }
      if (ok) {
        try { store() && store().setItem(KEY, PASS_HASH); } catch (x) {}
        root.classList.remove("locked");
        gate.remove();
      } else {
        err.textContent = "Wrong password. Try again.";
        input.select();
        form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake");
      }
    });
  }

  window.lockSite = function () {
    try { store() && store().removeItem(KEY); } catch (e) {}
    location.reload();
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (root.classList.contains("locked")) buildGate();
  });
})();
