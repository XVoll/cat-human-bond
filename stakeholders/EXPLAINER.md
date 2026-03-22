# EXPLAINER — CCHB Ecosystem Stakeholder Map (`stakeholders/`)

> This file is kept in sync with `src/App.jsx`, `src/data.js`, and `data/*.csv` at every commit.
> Last updated: 2026-03-20 — 182 actors · 16 categories · added MIT Solve, GSMA, ICMIF, Microinsurance Network, IBISA–Ensuro–One Acre Fund pilot; moved CGAP to Donor/funder; fixed ClimaCash link.

---

## What this app does

A searchable, filterable **card taxonomy browser** of the full CCHB (Cat-Cash-Human Bond) ecosystem. It maps 182 actors across 16 categories, showing each organisation's role, relevance to the protocol, and key tags. A dedicated **donor gap analysis** panel identifies likely funders not yet formally engaged.

The app is a pure browser tool — no backend, no authentication. It is designed to be shared as a link with potential partners, investors, and donors for orientation and due diligence.

---

## Features

| Feature | Description |
|---|---|
| **Category filter** | 15 toggle buttons, one per stakeholder category. Click to narrow the view; click again to clear. |
| **Search** | Full-text search across actor name, role description, and tags. Filters live as you type. |
| **Category filter** | 16 toggle buttons, one per stakeholder category. Click to narrow the view; click again to clear. |
| **Donor analysis panel** | A curated panel (shown when filter is All / Donor / Impact Finance) with 10 priority funders ranked by role: premium subsidy → proof-of-concept → DFI first-loss → ecosystem convener. |
| **Actor cards** | Each card shows: name, category dot, role description, tags, and an optional docs link. |

---

## Categories (16)

| Category | Colour | Description |
|---|---|---|
| Think tank / coordinator | `#378ADD` | Standards, learning, CVA & AA advocacy |
| Donor / funder | `#EF9F27` | Bilateral, foundation, premium payers, grants |
| Impact finance / blended | `#639922` | Blended tranches, SDG capital, impact AM, DFIs |
| Parametric insurer | `#1D9E75` | Designs, underwrites & bears parametric risk |
| Risk modeller / data trigger | `#5DCAA5` | Cat models, trigger indices, hazard verification |
| Cat bond / ILS infrastructure | `#7F77DD` | SPV structuring, issuance, blockchain settlement |
| Blockchain / DeFi insurance | `#BA7517` | On-chain parametric, smart contract, DeFi capital |
| ILS investor | `#AFA9EC` | Provides ILS capital, absorbs principal-at-risk |
| Re/insurer | `#888780` | Capacity provider, risk carrier, treaty layer |
| Broker / structuring agent | `#D4537E` | Placement, deal structuring, advisory |
| DFS / MNO / payment | `#97C459` | Last-mile wallet rails, aggregators, remittance |
| CVA / field implementer | `#D85A30` | Beneficiary registration, cash delivery, EAP ops |
| Data / analytics / tech | `#185FA5` | IM, geospatial, early warning, comms infra |
| UN — risk finance & DRF | `#0F6E56` | Sovereign risk pools, cat bond issuance, DRF |
| UN — humanitarian operations | `#085041` | Field ops, CVA delivery, pooled humanitarian funds |
| **Precedent instrument** | `#9333EA` | Documented CCHB-type mechanism already deployed at scale — sovereign parametric pool, pooled fund, or trigger-based humanitarian payout |

---

## CSV sync

The stakeholder data is kept in strict sync between `src/data.js` (used by React) and three CSV files in `data/` (editable in Excel / Google Sheets).

### Workflow

| Scenario | Command | What happens |
|---|---|---|
| You edited `data.js` | `npm run dev` or `npm run build` | `export-csv.mjs` runs automatically (`prebuild` / `predev`) and rewrites all three CSVs |
| You edited a CSV file | `npm run import-csv` | `import-csv.mjs` regenerates `src/data.js` from the CSVs; next build re-exports to confirm parity |
| Manual export at any time | `npm run export-csv` | Force-regenerate CSVs from current `data.js` |

### CSV files

| File | Rows | Content |
|---|---|---|
| `data/actors.csv` | 176 | All stakeholder actors. Columns: name, category, role, tags (pipe-separated), link. |
| `data/categories.csv` | 16 | Category names, hex dot colors, descriptions. |

### Scripts

- **`scripts/export-csv.mjs`** — reads `src/data.js` via ESM dynamic import, writes all three CSVs with proper RFC 4180 quoting (commas and newlines inside cells are safely escaped).
- **`scripts/import-csv.mjs`** — parses all three CSVs (handles quoted fields), rebuilds `src/data.js` with a header comment warning not to edit it directly.

---

## Data structure (`src/data.js`)

### `CATS`
An object keyed by category name. Each entry has:
- `dot` — hex color used for the category dot and section header
- `desc` — one-line description of the category's role in the CCHB ecosystem

### `ACTORS`
An array of actor objects. Each entry has:
| Field | Type | Description |
|---|---|---|
| `n` | string | Actor name |
| `c` | string | Category key (must match a key in `CATS`) |
| `r` | string | Role description — the actor's relevance to CCHB |
| `t` | string[] | Tags (3–5 keywords) |
| `link` | string? | URL to documentation or key resource |

### `DONOR_ANALYSIS`
An array of 10 priority donor/funder recommendations, each with:
- `tier` — one of: `"Premium subsidy"`, `"Proof-of-concept grant"`, `"DFI / first-loss tranche"`, `"Ecosystem / convener"`
- `tColor` / `tBg` — tier label colors
- `name` — actor name
- `text` — 2–4 sentence rationale for engagement

---

## File structure

```
stakeholders/
├── data/
│   ├── actors.csv        ← 176 stakeholder actors (auto-synced with data.js)
│   └── categories.csv    ← 15 categories with hex colors
├── scripts/
│   ├── export-csv.mjs    ← data.js → CSV  (runs on prebuild/predev)
│   └── import-csv.mjs    ← CSV → data.js  (run manually: npm run import-csv)
├── src/
│   ├── App.jsx           ← main React component (filter, search, cards, donor panel)
│   ├── App.css           ← all styles (dark theme, responsive grid)
│   ├── data.js           ← CATS, ACTORS, DONOR_ANALYSIS (auto-generated when imported from CSV)
│   └── main.jsx          ← React entry point
├── index.html            ← Vite HTML shell
├── package.json          ← dependencies + sync scripts
├── vite.config.js        ← Vite config (base: "/TBC-soon/stakeholders/")
├── EXPLAINER.md          ← this file
└── .gitignore            ← excludes node_modules/, dist/
```

---

## How to run locally

```bash
cd stakeholders/
npm install       # first time only
npm run dev       # starts Vite dev server on http://localhost:3841
```

---

## Live deployment

Deployed via GitHub Pages as part of the TBC-soon repo:
**https://xvoll.github.io/TBC-soon/stakeholders/**

The GitHub Actions workflow at `.github/workflows/deploy-schema.yml` builds and deploys automatically on every push to `main` that touches `stakeholders/**`.
