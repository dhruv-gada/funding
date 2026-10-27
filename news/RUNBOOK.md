# Bio × AI Deals — run book

This is what each scheduled run (around 9am and 5pm ET) does. The dashboard's **Bio × AI Deals** tab reads `data/news.json` straight from GitHub. The site is hosted on Render (https://fundingradar-oo4w.onrender.com, static site `fundingradar`, publish dir `dashboard`), which redeploys automatically on every push to `main`.

## Scope

Deals and money at the **intersection of AI and biology**:

- Funding rounds (pre-seed to late stage) for companies where AI/ML is core to drug discovery, protein/molecule design, computational biology, genomics, lab automation, clinical-trial AI, or biological foundation models
- Acquisitions and mergers involving such companies, including big tech or AI labs buying biotech
- Pharma ↔ AI partnerships and licensing deals (record upfront vs. total "biobucks" when disclosed)
- IPOs, SPACs, and major reported raises still in talks (mark `status: "In talks"`)
- Occasionally, a `Launch` that changes the deal picture (e.g. a major platform launch from a well-funded player)

Out of scope: healthcare admin/billing AI, generic hospital software, pure biotech with no AI angle, and pure AI with no bio angle.

## Each run

1. `git pull` so you start from the latest `data/news.json`.
2. Search the news for the last ~3 days. Run separate searches for: AI drug discovery funding, AI biotech acquisition, pharma AI partnership/licensing, computational biology / protein design startup raises, lab automation AI biotech, and named leaders (Isomorphic, Xaira, insitro, Recursion, Insilico, Chai, Generate, Lila, Enveda, etc.).
3. **Fetch the source pages for every new item** and take numbers only from them. If a figure can't be confirmed, leave it `null` or "Undisclosed". Never guess. Aim for **2–4 links per deal** (primary release + major outlets + any follow-up with investor or acquirer rationale) and store them in `links`.
   For each deal, write:
   - `why_invested`: the investor's, acquirer's or partner's rationale. Use what they stated where available; otherwise give your reasoned read and say so (e.g. "Likely: …").
   - `whats_next`: concrete next steps (programs, trials, hires, closings, milestones) and what to watch for.
   - `why_it_matters`: the signal, i.e. what this deal says about where the field is going.
4. Add new items to `items` (skip ones whose `id` already exists; update an existing item if its status changed, e.g. talks → closed). Drop items older than `window_days` (45).
5. Rewrite `analysis` for the full window:
   - `headline`: one sentence, the single most important takeaway
   - `summary`: 2–3 sentences with the key numbers
   - `themes`: 3–4 patterns, each tied to specific deals
   - `movers`: **where everyone is moving**, one entry per notable player (AI labs / big tech, pharma, VCs, crossover & sovereign funds). Each has `player`, `kind`, a one-line `direction`, a `detail` sentence or two, and `evidence` = list of item ids. Update the existing entries as new deals land, and add new players when they show up with two or more moves or one big one.
   - `predictions`: 3–6 falsifiable calls, each with `call`, `timeframe`, `confidence` (High/Medium/Low) and `based_on`. When a past call comes true or fails, say so in `since_last_run` and replace it.
   - `watchlist`: 3–5 concrete things to watch next
   - `since_last_run`: what is new or changed compared with the previous snapshot in `data/news-history/`. If nothing qualifying happened, say so plainly.
6. Set `last_updated` (UTC ISO) and `run_label` ("Morning brief · Oct 27, 2026" / "Evening brief · …").
7. Save a snapshot: `data/news-history/YYYY-MM-DD-am.json` or `-pm.json` containing `{last_updated, run_label, analysis, item_ids}`.
8. Validate: `python3 -m json.tool data/news.json > /dev/null`.
9. **Update the money map** (`data/flows.json`, see the section below): append every new deal from this run, update any whose status or terms changed, and add or extend a `chains` entry when a deal continues a chain (same backer or company moving again). Validate it too: `python3 -m json.tool data/flows.json > /dev/null`.
10. Commit `data/news.json`, `data/flows.json` and the snapshot with message `chore: bio×ai deals brief [YYYY-MM-DD am|pm]`, then push to `main`.

## Writing rules

- Write every `summary`, `why_it_matters` and analysis line in your own words. Don't copy article sentences, and use no direct quotes.
- Be specific: name the deals and the amounts. If a "deal value" is mostly milestones, say so.
- Use one `source_name` and `url` per item, preferring the primary source (company release, or a major outlet like Endpoints, STAT, Fierce, BioPharma Dive, TechCrunch).

## Item schema

```json
{
  "id": "YYYY-MM-DD-company-short-slug",
  "date": "YYYY-MM-DD",
  "type": "Funding | Acquisition | Partnership | IPO | Launch",
  "status": "Closed | Signed | In talks | Announced",
  "company": "Main company",
  "counterparty": "Lead investor / acquirer / pharma partner, or null",
  "amount_usd": 237000000,
  "amount_label": "$237M",
  "round": "Series E",
  "valuation_label": "$3B or null",
  "investors": ["..."],
  "area": "Short sub-field label",
  "summary": "1–2 sentences: what the company does and what happened",
  "why_invested": "Investor/acquirer rationale (stated, or 'Likely: …')",
  "whats_next": "Next steps and what to watch",
  "why_it_matters": "1 sentence: the signal",
  "links": [{"title": "Outlet: short description", "url": "https://..."}],
  "url": "https://... (primary link, also first in links)",
  "source_name": "Outlet",
  "first_seen": "UTC ISO time this run first added it"
}
```

Dashboard math: "Venture · last 7 days" sums `amount_usd` for `type: Funding` + `status: Closed` items dated in the past 7 days. Keep `amount_usd` as the actual round size (not valuation). For partnerships, use the headline total.


## Money map (`data/flows.json`)

This file powers the **Money Map 2026** tab (`/#money`): a flow diagram from source → channel → sector, monthly totals, money hubs, funding chains and a deal ledger. It is **cumulative from 2026-01-01**, so never drop old deals from it. The page computes every chart from `deals`; you only edit the data.

Deal schema:

```json
{
  "id": "v-company | p-pharma-company | a-acquirer-target | i-company | l-licensor",
  "date": "YYYY-MM-DD",
  "type": "Venture | Partnership | Acquisition | IPO | In-licensing",
  "company": "Company receiving the money (for In-licensing: the company being paid)",
  "sector": "Foundation models & platforms | Small molecule & peptide design | Protein & antibody design | Targets, delivery & biology | Lab automation & robotics | Clinical & development AI | Diagnostics & pathology AI | Longevity & reprogramming",
  "round": "Series B / deal scope / 'Acquired by X' / ticker",
  "cash_usd": 0,
  "headline_usd": 0,
  "amount_label": "Human label exactly as reported, e.g. '$40M upfront · up to $1.5B'",
  "payers": [{"name": "Lead investor / pharma / acquirer", "kind": "Venture capital | Pharma | Big tech & AI labs | Public markets | Sovereign & state | Undisclosed | AI biotech"}],
  "participants": [{"name": "Other notable investors", "kind": "..."}],
  "url": "https://primary source",
  "source_name": "Outlet",
  "note": "Optional caveat, or null"
}
```

Rules:
- **Venture:** `cash_usd` = `headline_usd` = round size. `payers` = the named lead(s); if none named, use `[{"name":"Lead not named","kind":"Undisclosed"}]` and list known backers in `participants`.
- **Partnership:** `cash_usd` = disclosed upfront only (null if undisclosed or vague); `headline_usd` = total potential value (null if undisclosed).
- **Acquisition:** `cash_usd` = disclosed upfront price; `headline_usd` = price including milestones. Mark stock deals in `note`.
- **IPO:** gross proceeds, payer `Public market investors` / `Public markets`.
- **In-licensing:** an AI biotech paying someone else. It shows in the ledger and chains, not in the flow diagram.
- Corporate venture arms count as their parent's kind (NVentures → Big tech & AI labs; Lilly Ventures, Merck GHI → Pharma). Use one consistent name per backer (e.g. always "Eli Lilly", always "NVIDIA (NVentures)") so the hubs ranking counts correctly.
- Chains: `{"id","title","kind","steps":[{"label","amount","deal": "<deal id or null>"}],"insight"}`. Keep 5–8 chains, focused on where money is moving next. Update the insight when a new step lands.
- Update `last_updated`. If a market-context figure gets a newer report (e.g. a Q3 or full-year review), replace it and keep the source link.
