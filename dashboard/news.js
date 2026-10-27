// ─────────────────────────────────────────────────────────────
// BIO × AI DEALS — reads data/news.json, written twice daily (9am & 5pm ET)
// ─────────────────────────────────────────────────────────────
const NEWS_URL = "https://raw.githubusercontent.com/elo252/funding/main/data/news.json";

let newsData = null;
let newsLoading = null;
let newsType = "All";

const DEAL_TYPES = ["All", "Funding", "Acquisition", "Partnership", "IPO", "Launch"];

async function loadNews(force = false) {
  if (newsData && !force) return newsData;
  if (newsLoading && !force) return newsLoading;
  newsLoading = (async () => {
    const res = await fetch(NEWS_URL + "?t=" + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    newsData = await res.json();
    return newsData;
  })();
  try { return await newsLoading; } finally { newsLoading = null; }
}

async function showNews(force = false) {
  const view = document.getElementById("newsView");
  if (!newsData || force) {
    view.innerHTML = `<div class="state-box"><div class="spinner"></div><p>Loading the latest bio × AI deals...</p></div>`;
  }
  try {
    await loadNews(force);
    renderNews();
  } catch (e) {
    view.innerHTML = `
      <div class="state-box error">
        <div class="error-icon">⚠</div>
        <p><strong>Could not load the deals brief.</strong></p>
        <p class="error-detail">${esc(e.message)}</p>
      </div>`;
  }
}

function fmtUSD(n) {
  if (!n) return "$0";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(n % 1e9 ? 1 : 0) + "B";
  return "$" + Math.round(n / 1e6) + "M";
}

function fmtDate(iso) {
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysAgo(iso) {
  return (Date.now() - new Date(iso + "T12:00:00").getTime()) / 864e5;
}

function renderNews() {
  const view = document.getElementById("newsView");
  const a = newsData.analysis || {};
  const items = [...(newsData.items || [])].sort((x, y) => (y.date || "").localeCompare(x.date || ""));

  const closedFunding = items.filter(i => i.type === "Funding" && i.status === "Closed");
  const week = closedFunding.filter(i => daysAgo(i.date) <= 7);
  const weekUSD = week.reduce((s, i) => s + (i.amount_usd || 0), 0);
  const windowUSD = closedFunding.reduce((s, i) => s + (i.amount_usd || 0), 0);
  const mna = items.filter(i => i.type === "Acquisition").length;
  const partners = items.filter(i => i.type === "Partnership").length;

  const updated = new Date(newsData.last_updated).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short"
  });

  const shown = newsType === "All" ? items : items.filter(i => i.type === newsType);
  const present = new Set(items.map(i => i.type));

  view.innerHTML = `
    <div class="brief">
      <div class="brief-kicker">
        <span>${esc(newsData.run_label || "Latest brief")}</span>
        <span class="brief-updated">Updated ${esc(updated)}</span>
      </div>
      <h2 class="brief-headline">${esc(a.headline || "")}</h2>
      <p class="brief-summary">${esc(a.summary || "")}</p>
      <div class="brief-stats">
        <div><strong>${fmtUSD(weekUSD)}</strong><span>Venture · last 7 days</span></div>
        <div><strong>${fmtUSD(windowUSD)}</strong><span>Venture · last ${newsData.window_days || 45} days</span></div>
        <div><strong>${mna}</strong><span>Acquisitions</span></div>
        <div><strong>${partners}</strong><span>Partnerships</span></div>
      </div>
      ${a.since_last_run ? `<p class="brief-delta"><span>Since last run</span>${esc(a.since_last_run)}</p>` : ""}
    </div>

    ${(a.movers || []).length ? `
    <div class="news-section-label">Where everyone is moving</div>
    <div class="movers">
      ${a.movers.map(m => `
        <div class="mover">
          <div class="mover-top">
            <span class="mover-name">${esc(m.player)}</span>
            <span class="mover-kind">${esc(m.kind)}</span>
          </div>
          <div class="mover-dir">→ ${esc(m.direction)}</div>
          <p>${esc(m.detail)}</p>
          <div class="mover-ev">${(() => {
            const ev = (m.evidence || []).map(id => items.find(i => i.id === id)).filter(Boolean);
            const dup = c => ev.filter(x => x.company === c).length > 1;
            return ev.map(it => {
              const label = dup(it.company) ? `${it.company} · ${it.round || it.type}` : it.company;
              return `<a href="#deal-${esc(it.id)}" onclick="jumpToDeal(event,'${esc(it.id)}')">${esc(label)}</a>`;
            }).join("");
          })()}</div>
        </div>`).join("")}
    </div>` : ""}

    ${(a.themes || []).length ? `
    <div class="news-section-label">What's driving it</div>
    <div class="themes">
      ${a.themes.map((t, idx) => `
        <div class="theme">
          <div class="theme-num">${String(idx + 1).padStart(2, "0")}</div>
          <div>
            <div class="theme-title">${esc(t.title)}</div>
            <p>${esc(t.detail)}</p>
          </div>
        </div>`).join("")}
    </div>` : ""}

    ${(a.predictions || []).length ? `
    <div class="news-section-label">What's next: our calls</div>
    <div class="calls">
      ${a.predictions.map(p => `
        <div class="call">
          <div class="call-main">
            <div class="call-text">${esc(p.call)}</div>
            <div class="call-basis">Based on: ${esc(p.based_on)}</div>
          </div>
          <div class="call-side">
            <span class="conf conf-${esc((p.confidence || "").toLowerCase())}">${esc(p.confidence)}</span>
            <span class="call-time">${esc(p.timeframe)}</span>
          </div>
        </div>`).join("")}
    </div>` : ""}

    ${(a.watchlist || []).length ? `
    <div class="watch">
      <div class="news-section-label">On the watchlist</div>
      <ul>${a.watchlist.map(w => `<li>${esc(w)}</li>`).join("")}</ul>
    </div>` : ""}

    <div class="deals-head">
      <div class="news-section-label">Deal log <span class="deal-count">${shown.length}</span></div>
      <div class="pills">
        ${DEAL_TYPES.filter(t => t === "All" || present.has(t)).map(t =>
          `<button class="pill${t === newsType ? " active" : ""}" onclick="setNewsType('${t}')">${t}</button>`).join("")}
      </div>
    </div>

    <div class="deals">
      ${shown.map(dealHTML).join("") || `<div class="state-box"><p>No ${esc(newsType.toLowerCase())} deals in this window.</p></div>`}
    </div>
  `;
}

function dealHTML(d) {
  const meta = [d.round, d.valuation_label ? "Valuation " + d.valuation_label : null, d.area]
    .filter(Boolean).map(esc).join(" · ");
  return `
    <article class="deal deal-${esc((d.type || "").toLowerCase())}" id="deal-${esc(d.id)}">
      <div class="deal-date">
        <span>${esc(fmtDate(d.date))}</span>
        <span class="deal-type">${esc(d.type)}</span>
      </div>
      <div class="deal-body">
        <div class="deal-top">
          <h3>${esc(d.company)}${d.counterparty ? ` <span class="deal-cp">× ${esc(d.counterparty)}</span>` : ""}</h3>
          ${d.amount_label ? `<div class="deal-amount">${esc(d.amount_label)}</div>` : ""}
        </div>
        <div class="deal-meta">${meta}${d.status && d.status !== "Closed" && d.status !== "Signed" ? ` <span class="deal-status">${esc(d.status)}</span>` : ""}</div>
        <p>${esc(d.summary)}</p>
        <div class="deal-analysis">
          ${d.why_invested ? `<div><span class="da-label">Why they did it</span><p>${esc(d.why_invested)}</p></div>` : ""}
          ${d.whats_next ? `<div><span class="da-label">What's next</span><p>${esc(d.whats_next)}</p></div>` : ""}
          ${d.why_it_matters ? `<div><span class="da-label">Signal</span><p>${esc(d.why_it_matters)}</p></div>` : ""}
        </div>
        ${(d.investors || []).length > 1 ? `<div class="deal-investors">${d.investors.map(i => `<span class="tag tag-badge">${esc(i)}</span>`).join("")}</div>` : ""}
        ${linksHTML(d)}
      </div>
    </article>`;
}

function linksHTML(d) {
  const links = (d.links && d.links.length) ? d.links : (d.url ? [{ title: d.source_name || "Source", url: d.url }] : []);
  if (!links.length) return "";
  return `<div class="deal-links"><span class="da-label">Sources (${links.length})</span><ul>${
    links.map(l => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)} ↗</a></li>`).join("")
  }</ul></div>`;
}

function jumpToDeal(e, id) {
  e.preventDefault();
  if (newsType !== "All") { newsType = "All"; renderNews(); }
  const el = document.getElementById("deal-" + id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("deal-flash");
    setTimeout(() => el.classList.remove("deal-flash"), 1600);
  }
}

function setNewsType(t) {
  newsType = t;
  renderNews();
}

// Refresh button reloads whichever tab is showing
const _origLoadData = loadData;
loadData = function () {
  if (activeTab === "news") return showNews(true);
  return _origLoadData();
};

// Deep link: /#deals opens the Bio × AI tab (on load and when a #deals link is clicked)
function syncHash() {
  if (location.hash === "#deals" && activeTab !== "news") {
    const btn = document.querySelector(".tab-news");
    if (btn) switchTab("news", btn);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
window.addEventListener("hashchange", syncHash);
syncHash();
