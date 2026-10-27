# FundingRadar 🔬
**Automated AI & BioMed PhD Funding Tracker**

Scrapes NIH, NSF, Grants.gov, Wellcome, Simons, HHMI, Hertz, Ford, ProFellow and more — daily, for free.

---

## 🗂 Project Structure

```
├── .github/workflows/scrape.yml   ← GitHub Actions: runs scraper daily
├── scraper/scraper.py             ← Python scraper
├── data/funding.json              ← Auto-updated output (committed by Actions)
└── dashboard/
    ├── index.html                 ← Hosted on Render (static site)
    ├── style.css
    └── app.js
```

---

> **Live:** https://fundingradar-oo4w.onrender.com, a Render static site (publish directory `dashboard`) that auto-deploys on every push. The Vercel steps below are the original alternative.

## 🚀 Setup (One Time, ~10 minutes)

### Step 1 — Create a GitHub Repo

1. Go to [github.com](https://github.com) → **New repository**
2. Name it e.g. `funding-radar`
3. Set it to **Public** (required for free raw file access)
4. Push all these files into it

### Step 2 — Enable GitHub Actions

1. In your repo → **Actions** tab
2. If prompted, click **"I understand my workflows, go ahead and enable them"**
3. The scraper will now run every day at 7am UTC automatically
4. To run it manually: Actions → "Scrape Funding Opportunities" → **Run workflow**

### Step 3 — Update the Dashboard URL

Open `dashboard/app.js` and replace line 4:

```js
// Change this:
const RAW_URL = "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/data/funding.json";

// To your actual repo, e.g.:
const RAW_URL = "https://raw.githubusercontent.com/janedoe/funding-radar/main/data/funding.json";
```

Commit and push this change.

### Step 4 — Deploy Dashboard to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Set **Root Directory** to `dashboard`
4. Click **Deploy** — done! 🎉

Your dashboard is now live at `your-project.vercel.app`

---

## 📡 Data Sources

| Source | Type | Method |
|---|---|---|
| NIH Guide | Federal | RSS feed |
| NSF | Federal | Web scrape |
| Grants.gov | Federal | RSS feed |
| NSF GRFP | Fellowship | Static + scrape |
| Hertz Foundation | Fellowship | Web scrape |
| Ford Foundation | Fellowship | Static |
| Simons Foundation | Private | Web scrape |
| Wellcome Trust | Private | Web scrape |
| HHMI | Private | Web scrape |
| ProFellow | Aggregator | Web scrape |

---

## ➕ Adding More Sources

Open `scraper/scraper.py` and add a new function:

```python
def scrape_my_source():
    results = []
    resp = requests.get("https://example.org/grants", headers=HEADERS, timeout=15)
    soup = BeautifulSoup(resp.text, "lxml")
    # parse and append to results...
    return results
```

Then add it to the `scrapers` list in `run()`.

---

## 🔧 Customizing Keywords

Edit the `KEYWORDS` list in `scraper/scraper.py` to match your research focus:

```python
KEYWORDS = [
    "artificial intelligence", "machine learning",
    "biomedical", "your specific subfield here", ...
]
```

---

## 💾 Bookmarks

Bookmarks are saved in your browser's `localStorage` — they persist across visits on the same browser.

---

## 🧬 Bio × AI Deals tab

A second tab on the dashboard tracks funding rounds, acquisitions and pharma partnerships at the intersection of AI and biology. Claude updates it twice a day (around 9am and 5pm ET) by researching the news, writing an analysis, and pushing `data/news.json`, with a snapshot in `data/news-history/`. See [`news/RUNBOOK.md`](news/RUNBOOK.md) for exactly what each run does. The **Money Map 2026** tab (`/#money`) maps where bio × AI money has come from and gone since January 2026, from `data/flows.json`. Live site: https://fundingradar-oo4w.onrender.com (deals tab: https://fundingradar-oo4w.onrender.com/#deals). Render redeploys on every push to `main`.
