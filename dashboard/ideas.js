// ─────────────────────────────────────────────────────────────
// RESEARCH IDEAS — reads data/ideas.json, refreshed with the twice-daily deals brief.
// Each idea links back to the deals (data/news.json) that make it timely.
// ─────────────────────────────────────────────────────────────
const IDEAS_URL = "https://raw.githubusercontent.com/elo252/funding/main/data/ideas.json";

let ideasData = null;
let ideasKind = "All";
let ideasLevel = "All";
let ideasShowRetired = false;

const IDEA_LEVELS = ["All", "Starter", "Intermediate", "Ambitious"];

async function showIdeas(force = false) {
  const view = document.getElementById("ideasView");
  if (!ideasData || force) {
    view.innerHTML = `<div class="state-box"><div class="spinner"></div><p>Loading research ideas...</p></div>`;
    try {
      const res = await fetch(IDEAS_URL + "?t=" + Date.now());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      ideasData = await res.json();
    } catch (e) {
      view.innerHTML = `<div class="state-box error"><div class="error-icon">⚠</div><p><strong>Could not load research ideas.</strong></p><p class="error-detail">${esc(e.message)}</p></div>`;
      return;
    }
    // Deal names for the evidence chips; the tab still works if this fails.
    try { if (typeof loadNews === "function") await loadNews(force); } catch (e) {}
  }
  renderIdeas();
}

function renderIdeas() {
  const view = document.getElementById("ideasView");
  const all = ideasData.ideas || [];
  const live = all.filter(i => i.status !== "Retired");
  const retired = all.filter(i => i.status === "Retired");
  const kinds = ["All", ...new Set(live.map(i => i.kind).filter(Boolean))];
  const shown = live.filter(i =>
    (ideasKind === "All" || i.kind === ideasKind) &&
    (ideasLevel === "All" || i.difficulty === ideasLevel));
  const nDatasets = new Set(live.flatMap(i => (i.datasets || []).map(d => d.url))).size;

  const updated = ideasData.last_updated ? new Date(ideasData.last_updated).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short"
  }) : "";

  view.innerHTML = `
    <div class="brief">
      <div class="brief-kicker">
        <span>Research ideas · ${esc(ideasData.run_label || "")}</span>
        <span class="brief-updated">${updated ? "Updated " + esc(updated) : ""}</span>
      </div>
      <h2 class="brief-headline">What to build next, from where the money is going</h2>
      <p class="brief-summary">${esc(ideasData.intro || "")}</p>
      <div class="brief-stats">
        <div><strong>${live.length}</strong><span>Active ideas</span></div>
        <div><strong>${nDatasets}</strong><span>Open datasets</span></div>
        <div><strong>${live.filter(i => i.difficulty === "Starter").length}</strong><span>Starter projects</span></div>
        <div><strong>${retired.length}</strong><span>Retired</span></div>
      </div>
      ${ideasData.since_last_run ? `<p class="brief-delta"><span>Since last run</span>${esc(ideasData.since_last_run)}</p>` : ""}
    </div>

    <div class="ideas-filters">
      <div class="filter-group"><span class="filter-label">Kind</span><div class="pills">
        ${kinds.map(k => `<button class="pill${k === ideasKind ? " active" : ""}" onclick="setIdeasFilter('kind','${esc(k)}')">${esc(k)}</button>`).join("")}
      </div></div>
      <div class="filter-group"><span class="filter-label">Level</span><div class="pills">
        ${IDEA_LEVELS.map(l => `<button class="pill${l === ideasLevel ? " active" : ""}" onclick="setIdeasFilter('level','${l}')">${l}</button>`).join("")}
      </div></div>
    </div>

    <div class="ideas">
      ${shown.map(ideaHTML).join("") || `<div class="state-box"><p>No ideas match these filters.</p></div>`}
    </div>

    ${retired.length ? `
    <div class="watch ideas-retired">
      <button class="ideas-toggle" onclick="ideasShowRetired=!ideasShowRetired;renderIdeas()">
        ${ideasShowRetired ? "Hide" : "Show"} retired ideas (${retired.length})
      </button>
      ${ideasShowRetired ? `<ul>${retired.map(i => `<li><strong>${esc(i.title)}</strong>${i.retired_reason ? ` · ${esc(i.retired_reason)}` : ""}</li>`).join("")}</ul>` : ""}
    </div>` : ""}
  `;
}

function ideaHTML(i) {
  const deals = (newsData && newsData.items) || [];
  const ev = (i.evidence || []).map(id => deals.find(d => d.id === id) || { id, company: id });
  const isNew = i.first_seen && (Date.now() - new Date(i.first_seen).getTime()) < 3 * 864e5;
  return `
    <article class="idea" id="idea-${esc(i.id)}">
      <div class="idea-top">
        <div class="idea-tags">
          <span class="idea-kind">${esc(i.kind)}</span>
          <span class="idea-level idea-level-${esc((i.difficulty || "").toLowerCase())}">${esc(i.difficulty)}</span>
          ${isNew ? `<span class="tab-new">NEW</span>` : ""}
        </div>
        <span class="idea-area">${esc(i.area)}</span>
      </div>
      <h3 class="idea-title">${esc(i.title)}</h3>
      <p class="idea-q">${esc(i.question)}</p>

      <div class="idea-why"><span class="da-label">Why now</span><p>${esc(i.why_now)}</p>
        ${ev.length ? `<div class="mover-ev">${ev.map(d => {
          const dup = ev.filter(x => x.company === d.company).length > 1;
          const label = dup ? `${d.company} × ${d.counterparty || d.round || d.type}` : d.company;
          return `<a href="#deals" onclick="ideaJumpToDeal(event,'${esc(d.id)}')">${esc(label)}</a>`;
        }).join("")}</div>` : ""}
      </div>

      ${(i.datasets || []).length ? `
      <div class="idea-data">
        <span class="da-label">Datasets (${i.datasets.length})</span>
        ${i.datasets.map(d => `
          <div class="idea-ds">
            <div class="idea-ds-top">
              <a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.name)} ↗</a>
              <span class="tag tag-badge">${esc(d.access)}</span>
            </div>
            <p>${esc(d.what)}${d.size ? ` <span class="idea-size">· ${esc(d.size)}</span>` : ""}</p>
          </div>`).join("")}
      </div>` : ""}

      <details class="idea-more">
        <summary>Plan, first milestone and what you need</summary>
        ${(i.approach || []).length ? `<div><span class="da-label">Approach</span><ol>${i.approach.map(s => `<li>${esc(s)}</li>`).join("")}</ol></div>` : ""}
        <div class="idea-grid">
          ${i.first_milestone ? `<div><span class="da-label">First milestone</span><p>${esc(i.first_milestone)}</p></div>` : ""}
          ${i.compute ? `<div><span class="da-label">Compute</span><p>${esc(i.compute)}</p></div>` : ""}
          ${i.who_cares ? `<div><span class="da-label">Who would care</span><p>${esc(i.who_cares)}</p></div>` : ""}
          ${i.risks ? `<div><span class="da-label">Watch out for</span><p>${esc(i.risks)}</p></div>` : ""}
        </div>
        ${(i.skills || []).length ? `<div class="deal-investors">${i.skills.map(s => `<span class="tag tag-badge">${esc(s)}</span>`).join("")}</div>` : ""}
      </details>
    </article>`;
}

function setIdeasFilter(which, val) {
  if (which === "kind") ideasKind = val; else ideasLevel = val;
  renderIdeas();
}

async function ideaJumpToDeal(e, id) {
  e.preventDefault();
  const btn = document.querySelector(".tab-news");
  if (btn) switchTab("news", btn);
  try { await loadNews(); } catch (err) { return; }
  renderNews();
  if (typeof jumpToDeal === "function") jumpToDeal({ preventDefault() {} }, id);
}
