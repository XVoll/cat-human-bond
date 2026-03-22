# EXPLAINER — Cost Calculator (calculator/)

> This file is kept in sync with `src/calculator.jsx` at every commit.
> Last updated: 2026-03-16 — initial React conversion from R Shiny app.R; probability shown as %; resilience / funding-layer / admin graphs removed; layout optimised.

---

## What this app does

An interactive React calculator that models the **cost structure of a dual-rail humanitarian parametric insurance programme** for smallholder farmers or vulnerable households.

Given a set of user-controlled parameters (number of persons, cat bond multiple, T-bond yield, reinsurance multiple, funding layer costs), it computes and displays:

| Output | What it shows |
|---|---|
| **Risk schedule table** | Contractual payout, probability (%), and Expected Annual Loss per person for each of the 4 risk tiers — scaled to all persons covered |
| **Payout per person chart** | Raw contractual payout if the event occurs — communicates the benefit to participants |
| **EAL per person chart** | Probability-weighted payout — the actuarially fair pure premium before loading |
| **Summary panel** | Live 2-year aggregated totals: cat bond breakdown, reinsurance, total donor cost, admin fee |

All monetary values are in **USD** unless stated. All totals cover the **2-year contract term** aggregated across all covered persons.

---

## Financial model

### Risk tiers (static — not user-configurable)

| Return period | Payout / person | Annual probability | EAL / person / yr |
|---|---|---|---|
| 1:10 | USD 500 | 10.00 % | USD 50.00 |
| 1:15 | USD 1 000 | 6.67 % | USD 66.67 |
| 1:20 | USD 1 500 | 5.00 % | USD 75.00 |
| 1:50 | USD 2 000 | 2.00 % | USD 40.00 |

`EAL = (1 / return_period) × payout_per_person`

### Cat bond layer (1:50 tier)

```
cb_principal  = 2 000 × n                         — ILS collateral locked up (face value)
cb_yield      = (T-bond_rate / 100) × 2 000 × 2 × n — yield on collateral over 2-year term
cb_premium    = cb_multiple × EAL₅₀ × 2 × n       — donor risk spread (2-year)
cb_total      = cb_principal + cb_yield + cb_premium
```

`cb_multiple` is the ILS risk premium multiplier. Market reference: Artemis Q4 2025 ILS report (avg 2.44×, EM agriculture parametric ~3–4× due to basis risk and illiquidity). Default: **3.0×**.

`T-bond yield` is the Swiss government bond yield earned on the collateral pool. Source: SNB / Trading Economics March 2026. Default: **0.40 %**.

### Reinsurance layer (1:20 tier)

```
reins_coverage = 1 500 × n                        — maximum payout face value
reins_premium  = ri_multiple × EAL₂₀ × 2 × n     — donor-paid premium (2-year)
```

`ri_multiple` is the rate-on-line multiplier. Market reference: Swiss Re parametric agriculture data (1.5–3× typical). Default: **2.0×**.

### Other funding layers

```
agri   = agri_cost   × n × 2     — Climate Smart Agriculture programme
others = others_cost × n × 2     — Solidarity / savings / complementary services
```

### Aggregate donor cost

```
donor_total = cb_premium + reins_premium + agri + others
admin_chf   = 0.04 × donor_total × usd_chf        — 4% management fee, in CHF
```

---

## Design system

Shares the same brand palette as `schema/catbond-diagram.jsx`.

| Token | Hex | Usage |
|---|---|---|
| `violet` | `#7C3FFF` | Primary — cat bond layer, active values, slider accent |
| `midnight` | `#200A5F` | Headings, bold totals |
| `lavender` | `#B48BFF` | Light purple accents |
| `petal` | `#EDE5FF` | Hover backgrounds |
| `teal` | `#00A878` | 1:10 return period |
| `amber` | `#F5A623` | 1:20 return period, donor costs |
| `crisis` | `#E63946` | 1:50 return period |
| `jet` | `#0D0D0D` | Body text |
| `slate` | `#6B6260` | Secondary text, axis labels, source links |
| `parchment` | `#E2E0D8` | Borders, grid lines, dividers |
| `chalk` | `#FAFAF8` | Page background |
| `white` | `#FFFFFF` | Card backgrounds, plot areas |

Return-period color mapping (consistent across table pills and chart bars):

| Tier | Color |
|---|---|
| 1:10 | teal — most frequent, lowest payout |
| 1:15 | violet |
| 1:20 | amber |
| 1:50 | crisis — rarest, highest payout |

Typography: `"Inter", system-ui, -apple-system, sans-serif` — no external font requests.

---

## File structure

```
calculator/
├── src/
│   ├── calculator.jsx    ← main React component (all UI and logic)
│   └── main.jsx          ← React entry point, mounts Calculator
├── index.html            ← Vite HTML shell
├── package.json          ← dependencies (react, react-dom, recharts, vite)
├── vite.config.js        ← Vite build config (React plugin, base path for GH Pages)
├── EXPLAINER.md          ← this file
└── .gitignore            ← excludes node_modules/, dist/
```

---

## Section-by-section walkthrough of `calculator.jsx`

### 1. Design tokens — `C`

```js
const C = { violet, midnight, lavender, petal, teal, amber, crisis,
            jet, slate, parchment, chalk, white }
```

All hex values in one flat object. Every style in the CSS string references `C.*` via template literals — no hardcoded colors elsewhere.

---

### 2. Return-period color map — `RP_COLOR`

```js
const RP_COLOR = { "1:10": C.teal, "1:15": C.violet, "1:20": C.amber, "1:50": C.crisis }
```

Used for both the colored pills in the table and the `<Cell fill>` in Recharts bar charts. Defining it once ensures table and chart always agree.

---

### 3. Static payout schedule — `SCHEDULE`

```js
const SCHEDULE = [
  { label: "1:10", rp: 10, payout: 500,  prob: 1/10, eal: 50   },
  { label: "1:15", rp: 15, payout: 1000, prob: 1/15, eal: 66.67},
  { label: "1:20", rp: 20, payout: 1500, prob: 1/20, eal: 75   },
  { label: "1:50", rp: 50, payout: 2000, prob: 1/50, eal: 40   },
];
```

This array is used directly as chart data for both Recharts `<BarChart>` components. No transformation needed — Recharts reads `payout` and `eal` by `dataKey`.

---

### 4. Formatters

```js
const fmt     = (n, d=0) => Intl.NumberFormat("en-US", { minimumFractionDigits: d, … }).format(n)
const fmtUSD  = (n)      => "USD " + fmt(Math.round(n))
const fmtCHF  = (n)      => "CHF " + fmt(Math.round(n))
const fmtPct  = (p)      => (p * 100).toFixed(2) + " %"   // probability: 0.1 → "10.00 %"
```

`fmtPct` is why probabilities appear as percentages (e.g. `10.00 %`) rather than decimals in the risk table.

---

### 5. Sub-components

#### `Slider`

```jsx
<Slider label value min max step unit onChange source />
```

A labeled `<input type="range">` that displays the current numeric value and an optional source link. `decimals` is auto-derived from `step` — a step of `0.05` gives 2 decimal places.

#### `ChartTooltip`

Custom Recharts tooltip component. Renders a white card with the return period label and formatted value. Shared by both bar charts via the `content` prop.

#### `SumRow`

One row in the summary panel: `label` left, `value` right. The `bold` flag gives the row the midnight/violet color treatment for top-level totals.

---

### 6. Calculator — state

```js
const [nPers,      setNPers]      = useState(1000);   // persons covered
const [cbMult,     setCbMult]     = useState(3.0);    // cat bond premium multiple × EAL₅₀
const [tbond,      setTbond]      = useState(0.40);   // Swiss T-bond yield (%)
const [riMult,     setRiMult]     = useState(2.0);    // reinsurance premium multiple × EAL₂₀
const [agriCost,   setAgriCost]   = useState(60);     // Climate Smart Agri (USD/person/yr)
const [othersCost, setOthersCost] = useState(30);     // Others (USD/person/yr)
const [usdChf,     setUsdChf]     = useState(0.79);   // USD → CHF rate
```

Seven state values — one per user-configurable parameter. All computations are derived from these; nothing is stored in state twice.

---

### 7. `costs` — derived financials via `useMemo`

```js
const costs = useMemo(() => { … }, [nPers, cbMult, tbond, riMult, agriCost, othersCost, usdChf]);
```

Recomputes only when one of the 7 inputs changes. Returns a plain object with all 2-year aggregated figures used in the summary panel. Mirrors the `costs()` reactive expression from the original R Shiny app.

---

### 8. `tableRows` — risk table data

```js
const tableRows = SCHEDULE.map((r) => ({
  ...r,
  totalPayout: r.payout * nPers,
  totalEal:    r.eal    * nPers,
}));
```

Adds the two `nPers`-scaled totals to each static row. Recomputed inline on every render (cheap — 4 rows).

---

### 9. Layout

```
┌─────────────────────────────────────────────────────────┐
│  sidebar (296px, sticky)  │  main (flex: 1)             │
│  ─────────────────────    │  ────────────────────────   │
│  Programme scale          │  Risk schedule table        │
│  Cat Bond — 1:50 layer    │                             │
│  Reinsurance — 1:20 layer │  [chart: payout]  [chart:   │
│  Funding layers           │                    EAL]     │
│  Currency                 │                             │
│  ─────────────────────    │                             │
│  2-year totals (summary)  │                             │
└─────────────────────────────────────────────────────────┘
```

Sidebar is `position: sticky; height: 100vh; overflow-y: auto` — it stays in place while the main panel scrolls. At ≤900px the layout stacks vertically (sidebar on top). The two charts sit in a `display: grid; grid-template-columns: 1fr 1fr` row, collapsing to single column at ≤900px.

---

### 10. Charts (Recharts)

Both charts use `<BarChart>` with:
- `<CartesianGrid vertical={false}>` — horizontal grid lines only, matching the clean Shiny layout
- `<XAxis>` — return period labels, no axis line or tick lines
- `<YAxis>` — `tickFormatter` converts to `$Xk` / `$X` for readability
- `<Tooltip content={<ChartTooltip />}>` — custom branded tooltip
- `<Bar radius={[5,5,0,0]}>` — rounded top corners
- `<Cell fill={RP_COLOR[r.label]}>` — per-bar color from `RP_COLOR`

Charts use `SCHEDULE` directly (static data) — they do **not** rescale with `nPers` because they show per-person figures.

---

### 11. CSS

Injected as a `<style>` tag via the `CSS` template literal at the bottom of the file (same pattern as `catbond-diagram.jsx`). No external stylesheet or CSS module. Key classes:

| Class | Purpose |
|---|---|
| `.root` | Flex container — sidebar + main |
| `.sidebar` | Fixed-width sticky column |
| `.section` | Bordered parameter group |
| `.param` | Single slider with label + value |
| `.section--summary` | Chalk-background summary block |
| `.card` | White rounded card (table, charts) |
| `.rp-pill` | Colored pill badge for return period |
| `.td-num` | Right-aligned tabular-nums cell |
| `.td-total` | Bold midnight-colored total cell |
| `.chart-tooltip` | Custom Recharts tooltip card |

---

## How to run locally

```bash
cd calculator/
npm install        # first time only
npm run dev        # Vite dev server → http://localhost:3840/TBC-soon/calculator/
```

Build for production:

```bash
npm run build      # output to calculator/dist/
```

GitHub Actions automatically builds and deploys both `schema/` and `calculator/` to GitHub Pages on every push to `main` that touches their respective directories. The calculator is nested at `/TBC-soon/calculator/` inside the schema build artifact.
