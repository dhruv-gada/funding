// ─────────────────────────────────────────────────────────────
// MONEY MAP 2026: where bio × AI money comes from, how it moves, where it lands
// Reads data/flows.json (updated by the twice-daily runs).
// ─────────────────────────────────────────────────────────────
const FLOWS_URL = "https://raw.githubusercontent.com/elo252/funding/main/data/flows.json";

// Fixed categorical order (validated palette); colour follows the source kind, never rank.
const KINDS = [
  { key: "Venture capital",    color: "#2a78d6" },
  { key: "Pharma",             color: "#eb6834" },
  { key: "Big tech & AI labs", color: "#1baf7a" },
  { key: "Public markets",     color: "#eda100" },
  { key: "Sovereign & state",  color: "#e87ba4" },
  { key: "Undisclosed",        color: "#a39e97" },
];
const KIND_COLOR = Object.fromEntries(KINDS.map(k => [k.key, k.color]));
const CHANNELS = { Venture: "Venture rounds", Partnership: "Pharma partnerships", Acquisition: "Acquisitions", IPO: "IPOs" };
const CHANNEL_ORDER = ["Venture rounds", "Pharma partnerships", "Acquisitions", "IPOs"];

let flowsData = null;
let moneyMode = "cash";            // "cash" | "headline"
let moneyFilter = null;            // {col, key, label}

async function showMoney(force = false) {
  const view = document.getElementById("moneyView");
  if (!flowsData || force) {
    view.innerHTML = `<div class="state-box"><div class="spinner"></div><p>Loading the 2026 money map...</p></div>`;
    try {
      const res = await fetch(FLOWS_URL + "?t=" + Date.now());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      flowsData = await res.json();
    } catch (e) {
      view.innerHTML = `<div class="state-box error"><div class="error-icon">⚠</div><p><strong>Could not load the money map.</strong></p><p class="error-detail">${esc(e.message)}</p></div>`;
      return;
    }
  }
  renderMoney();
}

// ─── helpers ───
const mFmt = n => {
  if (n == null) return "Undisclosed";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace(/\.0$/, "") + "B";
  if (n >= 1e6) return "$" + (n / 1e6 >= 100 ? Math.round(n / 1e6) : (n / 1e6).toFixed(1).replace(/\.0$/, "")) + "M";
  return "$" + Math.round(n / 1e3) + "K";
};
const mDate = iso => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const valOf = d => (moneyMode === "cash" ? d.cash_usd : d.headline_usd) || 0;
const inbound = () => flowsData.deals.filter(d => CHANNELS[d.type]);

// Split each deal across its payers → one flow per (kind, channel, sector)
function flowRows() {
  const rows = [];
  inbound().forEach(d => {
    const v = valOf(d);
    if (!v) return;
    const payers = d.payers && d.payers.length ? d.payers : [{ name: "Lead not named", kind: "Undisclosed" }];
    payers.forEach(p => rows.push({
      kind: KIND_COLOR[p.kind] ? p.kind : "Undisclosed",
      channel: CHANNELS[d.type], sector: d.sector, value: v / payers.length, deal: d,
    }));
  });
  return rows;
}

function dealMatchesFilter(d) {
  if (!moneyFilter) return true;
  const { col, key } = moneyFilter;
  if (col === "kind") return (d.payers || []).some(p => p.kind === key) || (key === "Undisclosed" && !(d.payers || []).length);
  if (col === "channel") return CHANNELS[d.type] === key;
  if (col === "sector") return d.sector === key;
  if (col === "backer") return [...(d.payers || []), ...(d.participants || [])].some(p => normName(p.name) === key);
  if (col === "deal") return d.id === key;
  return true;
}
const normName = n => n.replace(/\s*\(NVentures\)/, "").replace(/\s*\(via .*\)/, "").replace(/\s*\(Anthology Fund.*\)/, "");

// ─── RENDER ───
function renderMoney() {
  const view = document.getElementById("moneyView");
  const F = flowsData;
  const deals = inbound();
  const sum = (t, f) => deals.filter(d => !t || d.type === t).reduce((s, d) => s + (d[f] || 0), 0);
  const count = t => deals.filter(d => d.type === t).length;
  const undis = t => deals.filter(d => d.type === t && d.cash_usd == null).length;
  const lastDate = deals.reduce((m, d) => d.date > m ? d.date : m, "");

  view.innerHTML = `
    <div class="brief money-hero">
      <div class="brief-kicker">
        <span>Money map · Jan 1 – ${esc(mDate(lastDate))}, 2026</span>
        <span class="brief-updated">${deals.length} sourced deals</span>
      </div>
      <h2 class="brief-headline">Where bio × AI money comes from, how it moves, and where it lands</h2>
      <p class="brief-summary">Venture investors put up most of the cash. Pharma signs the biggest headline numbers but pays little upfront. Big tech and AI labs are buying their way in, and sovereign funds sit in the largest rounds.</p>
      <div class="brief-stats">
        <div><strong>${mFmt(sum(null, "cash_usd"))}</strong><span>Cash that moved</span></div>
        <div><strong>${mFmt(sum("Venture", "cash_usd"))}</strong><span>Venture · ${count("Venture")} rounds</span></div>
        <div><strong>${mFmt(sum("Partnership", "cash_usd"))}</strong><span>Pharma upfront, of ${mFmt(sum("Partnership", "headline_usd"))} headline</span></div>
        <div><strong>${mFmt(sum("Acquisition", "cash_usd") + sum("IPO", "cash_usd"))}</strong><span>M&amp;A + IPOs · ${undis("Acquisition")} undisclosed</span></div>
      </div>
    </div>

    <div class="money-section">
      <div class="money-head">
        <div>
          <div class="news-section-label">The flow</div>
          <h3 class="money-h">Source → how the money moves → what it funds</h3>
        </div>
        <div class="seg" role="group" aria-label="Value basis">
          <button class="${moneyMode === "cash" ? "on" : ""}" onclick="setMoneyMode('cash')">Cash that moved</button>
          <button class="${moneyMode === "headline" ? "on" : ""}" onclick="setMoneyMode('headline')">Headline value</button>
        </div>
      </div>
      <p class="money-note">${esc(moneyMode === "cash" ? F.method.cash : F.method.headline)} Click any bar to filter the deal ledger.</p>
      <div class="sankey-wrap"><div class="sankey-scroll" id="sankey"></div></div>
      <p class="swipe-hint">Swipe sideways to see the full map →</p>
    </div>

    <div class="money-grid">
      <div class="money-section">
        <div class="news-section-label">By month</div>
        <h3 class="money-h">When the money landed (${moneyMode === "cash" ? "cash" : "headline"})</h3>
        <div class="legend">${KINDS.map(k => `<span><i style="background:${k.color}"></i>${esc(k.key)}</span>`).join("")}</div>
        <div id="monthly"></div>
        <div class="news-section-label top-label">Largest single deals (${moneyMode === "cash" ? "cash" : "headline"})</div>
        <ol class="top-deals" id="topDeals"></ol>
      </div>
      <div class="money-section">
        <div class="news-section-label">Money hubs</div>
        <h3 class="money-h">Who shows up in the most deals</h3>
        <div id="hubs"></div>
      </div>
    </div>

    <div class="money-section">
      <div class="news-section-label">Funding chains</div>
      <h3 class="money-h">How money hops from one player to the next</h3>
      <div class="chains">${(F.chains || []).map(chainHTML).join("")}</div>
    </div>

    <div class="money-section" id="ledger-anchor">
      <div class="money-head">
        <div>
          <div class="news-section-label">Deal ledger</div>
          <h3 class="money-h">Every deal on the map, with sources</h3>
        </div>
        <div id="ledgerFilter"></div>
      </div>
      <div id="ledger"></div>
    </div>

    <div class="money-section money-foot">
      <div class="news-section-label">Market context</div>
      <ul class="ctx">${(F.market_context || []).map(c => `<li><strong>${esc(c.value)}</strong> · ${esc(c.label)} · <a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.source)} ↗</a></li>`).join("")}</ul>
      <p class="money-note">${esc(F.method.scope)}</p>
    </div>
    <div class="m-tip" id="mTip" role="tooltip"></div>
  `;
  drawSankey();
  drawMonthly();
  drawTopDeals();
  drawHubs();
  drawLedger();
}

function setMoneyMode(m) { moneyMode = m; renderMoney(); }

// ─── TOOLTIP ───
function tipShow(e, html) {
  const t = document.getElementById("mTip");
  if (!t) return;
  t.innerHTML = html;
  t.style.display = "block";
  const pad = 14, w = t.offsetWidth, h = t.offsetHeight;
  let x = e.clientX + pad, y = e.clientY + pad;
  if (x + w > window.innerWidth - 8) x = e.clientX - w - pad;
  if (y + h > window.innerHeight - 8) y = e.clientY - h - pad;
  t.style.left = Math.max(8, x) + "px";
  t.style.top = Math.max(8, y) + "px";
}
function tipHide() { const t = document.getElementById("mTip"); if (t) t.style.display = "none"; }

// ─── SANKEY (hand-built, 3 columns) ───
function drawSankey() {
  const rows = flowRows();
  const host = document.getElementById("sankey");
  if (!rows.length) { host.innerHTML = `<p class="money-note">No disclosed amounts yet.</p>`; return; }

  const W = 980, H = 600, NW = 14, PAD = 14, LM = 168, RM = 268, VM = 8, MINH = 3;
  const total = rows.reduce((s, r) => s + r.value, 0);
  const agg = (keyFn) => { const m = new Map(); rows.forEach(r => m.set(keyFn(r), (m.get(keyFn(r)) || 0) + r.value)); return m; };

  const kindVals = agg(r => r.kind), chVals = agg(r => r.channel), secVals = agg(r => r.sector);
  const cols = [
    { id: "kind",    x: LM,                     nodes: KINDS.map(k => k.key).filter(k => kindVals.has(k)).map(k => ({ key: k, v: kindVals.get(k) })) },
    { id: "channel", x: LM + (W - LM - RM) / 2 - NW / 2, nodes: CHANNEL_ORDER.filter(c => chVals.has(c)).map(c => ({ key: c, v: chVals.get(c) })) },
    { id: "sector",  x: W - RM - NW,            nodes: [...secVals.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, v })) },
  ];
  const ky = Math.min(...cols.map(c => (H - 2 * VM - PAD * (c.nodes.length - 1) - MINH * c.nodes.length) / total));
  cols.forEach(c => {
    const used = c.nodes.reduce((s, n) => s + Math.max(MINH, n.v * ky), 0) + PAD * (c.nodes.length - 1);
    let y = (H - used) / 2;
    c.nodes.forEach(n => { n.h = Math.max(MINH, n.v * ky); n.y = y; n.out = y; n.in = y; y += n.h + PAD; });
    c.map = Object.fromEntries(c.nodes.map(n => [n.key, n]));
  });
  const [C0, C1, C2] = cols;
  const kindIdx = Object.fromEntries(KINDS.map((k, i) => [k.key, i]));
  const secIdx = Object.fromEntries(C2.nodes.map((n, i) => [n.key, i]));
  const chIdx = Object.fromEntries(C1.nodes.map((n, i) => [n.key, i]));

  // stage 1: kind → channel ; stage 2: channel → sector (kept per kind so colour carries through)
  const s1 = new Map(), s2 = new Map();
  rows.forEach(r => {
    const a = r.kind + "|" + r.channel, b = r.channel + "|" + r.sector + "|" + r.kind;
    if (!s1.has(a)) s1.set(a, { kind: r.kind, from: r.kind, to: r.channel, v: 0, deals: new Set() });
    if (!s2.has(b)) s2.set(b, { kind: r.kind, from: r.channel, to: r.sector, v: 0, deals: new Set() });
    s1.get(a).v += r.value; s1.get(a).deals.add(r.deal.id);
    s2.get(b).v += r.value; s2.get(b).deals.add(r.deal.id);
  });
  const L1 = [...s1.values()].sort((a, b) => kindIdx[a.from] - kindIdx[b.from] || chIdx[a.to] - chIdx[b.to]);
  const L2 = [...s2.values()].sort((a, b) => chIdx[a.from] - chIdx[b.from] || secIdx[a.to] - secIdx[b.to] || kindIdx[a.kind] - kindIdx[b.kind]);
  // incoming order on channel nodes follows kind order (matches L1 order per target)
  const place = (links, A, B) => {
    links.forEach(l => { l.h = l.v * ky; });
    links.forEach(l => { const s = A.map[l.from]; l.y0 = s.out; s.out += l.h; });
    [...links].sort((a, b) => (A.map[a.from].y - A.map[b.from].y) || (kindIdx[a.kind] - kindIdx[b.kind]))
      .forEach(l => { const t = B.map[l.to]; l.y1 = t.in; t.in += l.h; });
  };
  place(L1, C0, C1);
  C1.nodes.forEach(n => { n.out = n.y; });
  // order stage-2 sources on channel nodes so incoming kind bands roughly continue
  place(L2, C1, C2);

  const band = (x0, x1, l) => {
    const h = Math.max(1, l.h), xm = (x0 + x1) / 2;
    return `M${x0},${l.y0}C${xm},${l.y0} ${xm},${l.y1} ${x1},${l.y1}L${x1},${l.y1 + h}C${xm},${l.y1 + h} ${xm},${l.y0 + h} ${x0},${l.y0 + h}Z`;
  };
  const isOn = (col, key) => moneyFilter && moneyFilter.col === col && moneyFilter.key === key;
  const dim = l => moneyFilter && ["kind", "channel", "sector"].includes(moneyFilter.col) &&
    !((moneyFilter.col === "kind" && l.kind === moneyFilter.key) || l.from === moneyFilter.key || l.to === moneyFilter.key);

  let svg = `<svg viewBox="0 0 ${W} ${H}" class="sankey" role="img" aria-label="Sankey diagram of 2026 bio × AI money flows from source type through deal channel to sector">`;
  const linkSVG = (L, xa, xb, stage) => L.map((l, i) =>
    `<path class="sk-link${dim(l) ? " dim" : ""}" d="${band(xa, xb, l)}" fill="${KIND_COLOR[l.kind]}" data-s="${stage}" data-i="${i}"></path>`).join("");
  svg += linkSVG(L1, C0.x + NW, C1.x, 1) + linkSVG(L2, C1.x + NW, C2.x, 2);

  const nodeSVG = (c, labelSide) => c.nodes.map(n => {
    const fill = c.id === "kind" ? KIND_COLOR[n.key] : "var(--brown-dark)";
    const lx = labelSide === "left" ? c.x - 8 : c.x + NW + 8;
    const anchor = labelSide === "left" ? "end" : "start";
    const ly = n.y + n.h / 2;
    const tall = n.h >= 26;
    return `<g class="sk-node${isOn(c.id, n.key) ? " on" : ""}" data-col="${c.id}" data-key="${esc(n.key)}" tabindex="0" role="button" aria-label="${esc(n.key)}: ${mFmt(n.v)}. Filter ledger">
      <rect x="${c.x - 4}" y="${n.y - 3}" width="${NW + 8}" height="${n.h + 6}" fill="transparent"></rect>
      <rect x="${c.x}" y="${n.y}" width="${NW}" height="${n.h}" rx="2" fill="${fill}"></rect>
      <text x="${lx}" y="${tall ? ly - 3 : ly + 4}" text-anchor="${anchor}" class="sk-lbl">${esc(n.key)}${tall ? "" : `<tspan class="sk-val" dx="6">${mFmt(n.v)}</tspan>`}</text>
      ${tall ? `<text x="${lx}" y="${ly + 13}" text-anchor="${anchor}" class="sk-val">${mFmt(n.v)} · ${Math.round(n.v / total * 100)}%</text>`
             : ""}
    </g>`;
  }).join("");
  svg += nodeSVG(C0, "left") + nodeSVG(C1, "right") + nodeSVG(C2, "right");
  svg += `</svg>`;
  host.innerHTML = svg;

  // interactions
  const L = { 1: L1, 2: L2 };
  host.querySelectorAll(".sk-link").forEach(p => {
    const l = L[p.dataset.s][+p.dataset.i];
    p.addEventListener("mousemove", e => tipShow(e, `<b>${esc(l.from)} → ${esc(l.to)}</b>${l.from !== l.kind && p.dataset.s === "2" ? `<div class="tt-k"><i style="background:${KIND_COLOR[l.kind]}"></i>from ${esc(l.kind)}</div>` : ""}<div class="tt-v">${mFmt(l.v)}</div><div class="tt-m">${l.deals.size} deal${l.deals.size > 1 ? "s" : ""}: ${esc(dealNames(l.deals))}</div>`));
    p.addEventListener("mouseleave", tipHide);
  });
  host.querySelectorAll(".sk-node").forEach(g => {
    const act = () => setMoneyFilter(g.dataset.col, g.dataset.key, g.dataset.key);
    g.addEventListener("click", act);
    g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } });
    g.addEventListener("mousemove", e => {
      const c = cols.find(c => c.id === g.dataset.col); const n = c.map[g.dataset.key];
      tipShow(e, `<b>${esc(n.key)}</b><div class="tt-v">${mFmt(n.v)} · ${Math.round(n.v / total * 100)}%</div><div class="tt-m">Click to filter the ledger</div>`);
    });
    g.addEventListener("mouseleave", tipHide);
  });
}

function dealNames(ids) {
  const names = [...ids].map(id => flowsData.deals.find(d => d.id === id)).filter(Boolean).map(d => d.company);
  const uniq = [...new Set(names)];
  return uniq.length > 5 ? uniq.slice(0, 5).join(", ") + ` +${uniq.length - 5} more` : uniq.join(", ");
}

// ─── MONTHLY STACKED BARS (by source kind) ───
function drawMonthly() {
  const rows = flowRows();
  const months = [];
  const start = new Date(flowsData.since + "T12:00:00");
  const last = rows.reduce((m, r) => r.deal.date > m ? r.deal.date : m, flowsData.since);
  for (let d = new Date(start); d <= new Date(last + "T12:00:00"); d.setMonth(d.getMonth() + 1)) months.push(d.toISOString().slice(0, 7));
  const byM = months.map(m => {
    const parts = KINDS.map(k => ({ kind: k.key, v: rows.filter(r => r.deal.date.startsWith(m) && r.kind === k.key).reduce((s, r) => s + r.value, 0) }));
    return { m, parts, total: parts.reduce((s, p) => s + p.v, 0), n: new Set(rows.filter(r => r.deal.date.startsWith(m)).map(r => r.deal.id)).size };
  });
  const max = Math.max(...byM.map(b => b.total), 1);
  const nice = niceMax(max);
  const W = 460, H = 240, L = 44, B = 24, T = 10, bw = (W - L) / months.length;
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="mchart" role="img" aria-label="Monthly money by source">`;
  [0, 0.5, 1].forEach(f => {
    const y = T + (H - T - B) * (1 - f);
    svg += `<line x1="${L}" x2="${W}" y1="${y}" y2="${y}" class="grid"/><text x="${L - 6}" y="${y + 4}" text-anchor="end" class="ax">${f ? mFmt(nice * f) : "$0"}</text>`;
  });
  byM.forEach((b, i) => {
    const x = L + i * bw + bw * 0.18, w = bw * 0.64;
    let y = H - B;
    const segs = b.parts.filter(p => p.v > 0);
    segs.forEach((p, j) => {
      const h = (H - T - B) * p.v / nice;
      const top = j === segs.length - 1;
      const gap = j > 0 ? 2 : 0;
      svg += top
        ? `<path d="${roundTop(x, y - h, w, Math.max(0, h - gap), 4)}" fill="${KIND_COLOR[p.kind]}"/>`
        : `<rect x="${x}" y="${y - h}" width="${w}" height="${Math.max(0, h - gap)}" fill="${KIND_COLOR[p.kind]}"/>`;
      y -= h;
    });
    svg += `<rect x="${L + i * bw}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent" class="hit" data-i="${i}"/>`;
    svg += `<text x="${L + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle" class="ax">${new Date(b.m + "-15").toLocaleDateString("en-US", { month: "short" })}</text>`;
  });
  svg += `</svg>`;
  const host = document.getElementById("monthly");
  host.innerHTML = svg;
  host.querySelectorAll(".hit").forEach(r => {
    const b = byM[+r.dataset.i];
    r.addEventListener("mousemove", e => tipShow(e,
      `<b>${new Date(b.m + "-15").toLocaleDateString("en-US", { month: "long", year: "numeric" })}</b><div class="tt-v">${mFmt(b.total)} · ${b.n} deals</div>` +
      b.parts.filter(p => p.v).map(p => `<div class="tt-k"><i style="background:${KIND_COLOR[p.kind]}"></i>${esc(p.kind)} <span>${mFmt(p.v)}</span></div>`).join("")));
    r.addEventListener("mouseleave", tipHide);
  });
}
function niceMax(v) { const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p; return 10 * p; }
function roundTop(x, y, w, h, r) {
  r = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function drawTopDeals() {
  const top = inbound().filter(d => valOf(d) > 0).sort((a, b) => valOf(b) - valOf(a)).slice(0, 6);
  document.getElementById("topDeals").innerHTML = top.map(d => `
    <li><button onclick="setMoneyFilter('deal','${esc(d.id)}','${esc(d.company.replace(/'/g, ""))}')">
      <span><strong>${esc(d.company)}</strong> <em>${esc(d.type)}${d.payers && d.payers[0] && d.payers[0].kind !== "Undisclosed" ? " · " + esc(d.payers.map(p => p.name).join(", ")) : ""}</em></span>
      <span class="td-amt">${mFmt(valOf(d))}</span></button></li>`).join("");
}

// ─── HUBS (who appears in most deals) ───
function drawHubs() {
  const m = new Map();
  flowsData.deals.forEach(d => {
    const seen = new Set();
    [...(d.payers || []).map(p => ({ ...p, lead: true })), ...(d.participants || [])].forEach(p => {
      const n = normName(p.name);
      if (p.kind === "Undisclosed" || n === "Public market investors" || n === "Lead not named" || seen.has(n)) return;
      seen.add(n);
      if (!m.has(n)) m.set(n, { name: n, kind: p.kind, deals: [], led: 0 });
      const h = m.get(n); h.deals.push(d); if (p.lead) h.led++;
    });
  });
  const hubs = [...m.values()].filter(h => h.deals.length >= 2)
    .sort((a, b) => b.deals.length - a.deals.length || b.led - a.led || a.name.localeCompare(b.name)).slice(0, 12);
  const max = Math.max(...hubs.map(h => h.deals.length));
  document.getElementById("hubs").innerHTML = `<div class="hubs">${hubs.map(h => `
    <button class="hub${moneyFilter && moneyFilter.col === "backer" && moneyFilter.key === h.name ? " on" : ""}" data-n="${esc(h.name)}">
      <span class="hub-name">${esc(h.name)}<em>${esc(h.kind)}</em></span>
      <span class="hub-bar"><i style="width:${h.deals.length / max * 100}%;background:${KIND_COLOR[h.kind] || "#a39e97"}"></i></span>
      <span class="hub-n">${h.deals.length}<small>${h.led ? ` · led ${h.led}` : ""}</small></span>
    </button>`).join("")}</div>`;
  document.querySelectorAll(".hub").forEach(b => {
    const h = hubs.find(x => x.name === b.dataset.n);
    b.addEventListener("click", () => setMoneyFilter("backer", h.name, h.name));
    b.addEventListener("mousemove", e => tipShow(e, `<b>${esc(h.name)}</b><div class="tt-m">${esc([...new Set(h.deals.map(d => d.company))].join(", "))}</div>`));
    b.addEventListener("mouseleave", tipHide);
  });
}

// ─── CHAINS ───
function chainHTML(c) {
  return `<div class="chain" style="--k:${KIND_COLOR[c.kind] || "#a39e97"}">
    <div class="chain-title">${esc(c.title)}</div>
    <ol class="chain-steps">${c.steps.map(s => `
      <li>${s.deal ? `<a href="#ledger-anchor" onclick="event.preventDefault();setMoneyFilter('deal','${esc(s.deal)}','${esc(s.label.replace(/'/g, ""))}')">` : "<span>"}
        <span class="cs-label">${esc(s.label)}</span><span class="cs-amt">${esc(s.amount)}</span>
      ${s.deal ? "</a>" : "</span>"}</li>`).join("")}
    </ol>
    <p class="chain-insight">${esc(c.insight)}</p>
  </div>`;
}

// ─── LEDGER ───
function setMoneyFilter(col, key, label) {
  if (col == null) moneyFilter = null;
  else if (moneyFilter && moneyFilter.col === col && moneyFilter.key === key) moneyFilter = null;
  else moneyFilter = { col, key, label };
  tipHide();
  drawSankey(); drawHubs(); drawLedger();
  if (moneyFilter && (col === "deal" || col === "backer")) document.getElementById("ledger-anchor").scrollIntoView({ behavior: "smooth", block: "start" });
}
function drawLedger() {
  const rows = [...flowsData.deals].filter(dealMatchesFilter).sort((a, b) => b.date.localeCompare(a.date));
  document.getElementById("ledgerFilter").innerHTML = moneyFilter
    ? `<button class="filter-chip" onclick="setMoneyFilter(null,null)">${esc(moneyFilter.label)} <span aria-hidden="true">✕</span><span class="sr">Clear filter</span></button>`
    : `<span class="money-note">${rows.length} deals</span>`;
  document.getElementById("ledger").innerHTML = `
    <div class="ledger">
      <div class="lg-row lg-head"><span>Date</span><span>Company</span><span>Deal</span><span>Money from</span><span class="r">Amount</span><span>Source</span></div>
      ${rows.map(d => `
        <div class="lg-row">
          <span class="lg-date">${esc(mDate(d.date))}</span>
          <span class="lg-co"><strong>${esc(d.company)}</strong>${d.sector ? `<em>${esc(d.sector)}</em>` : ""}</span>
          <span class="lg-type">${esc(d.type)}${d.round ? ` · ${esc(d.round)}` : ""}</span>
          <span class="lg-from">${(d.payers || []).map(p => `<span class="who"><i style="background:${KIND_COLOR[p.kind] || "#a39e97"}"></i>${esc(p.name)}</span>`).join("")}${(d.participants || []).length ? `<small>with ${esc(d.participants.slice(0, 4).map(p => normName(p.name)).join(", "))}${d.participants.length > 4 ? "…" : ""}</small>` : ""}</span>
          <span class="lg-amt r">${esc(d.amount_label)}</span>
          <span class="lg-src"><a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.source_name)} ↗</a></span>
          ${d.note ? `<span class="lg-note">${esc(d.note)}</span>` : ""}
        </div>`).join("")}
    </div>`;
}
