import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  Cell, ResponsiveContainer, CartesianGrid,
} from "recharts";

/* ═══════════════════════════════════════════════════════════════════════════
   DESIGN TOKENS
   Brand palette — same family as catbond-diagram.jsx so both tools share
   a coherent visual identity.
   ═══════════════════════════════════════════════════════════════════════════ */
const C = {
  violet:    "#7C3FFF",   // primary — cat bond / ILS layer
  midnight:  "#200A5F",   // darkest purple — headings, large numbers
  lavender:  "#B48BFF",   // light purple — secondary accents
  petal:     "#EDE5FF",   // pale purple — hover backgrounds
  teal:      "#00A878",   // reinsurance / climate-smart layers
  amber:     "#F5A623",   // donor costs / warnings
  crisis:    "#E63946",   // high-risk / 1:50 tier
  jet:       "#0D0D0D",   // body text
  slate:     "#6B6260",   // secondary text, axis labels, source links
  parchment: "#E2E0D8",   // borders, grid lines, dividers
  chalk:     "#FAFAF8",   // page background
  white:     "#FFFFFF",   // card backgrounds, plot areas
};

/* Per-return-period color mapping — consistent across table badges and charts */
const RP_COLOR = {
  "1:10": C.teal,    // most frequent — lowest payout
  "1:15": C.violet,
  "1:20": C.amber,
  "1:50": C.crisis,  // rarest — highest payout
};

/* ═══════════════════════════════════════════════════════════════════════════
   STATIC DATA — Payout schedule
   Return period × Payout per person → Probability → EAL per person / yr
   ═══════════════════════════════════════════════════════════════════════════ */
const SCHEDULE = [
  { label: "1:10", rp: 10, payout: 500,  prob: 1 / 10, eal: (1 / 10) * 500  },
  { label: "1:15", rp: 15, payout: 1000, prob: 1 / 15, eal: (1 / 15) * 1000 },
  { label: "1:20", rp: 20, payout: 1500, prob: 1 / 20, eal: (1 / 20) * 1500 },
  { label: "1:50", rp: 50, payout: 2000, prob: 1 / 50, eal: (1 / 50) * 2000 },
];

/* ═══════════════════════════════════════════════════════════════════════════
   FORMATTERS
   ═══════════════════════════════════════════════════════════════════════════ */
const fmt  = (n, d = 0) => new Intl.NumberFormat("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
const fmtUSD = (n) => "USD " + fmt(Math.round(n));
const fmtCHF = (n) => "CHF " + fmt(Math.round(n));
const fmtPct = (p) => (p * 100).toFixed(2) + " %";

/* ═══════════════════════════════════════════════════════════════════════════
   SLIDER — labeled range input with an optional source link
   ═══════════════════════════════════════════════════════════════════════════ */
function Slider({ label, value, min, max, step, unit = "", onChange, source }) {
  const decimals = step < 1 ? (String(step).split(".")[1]?.length ?? 2) : 0;
  return (
    <div className="param">
      <div className="param-header">
        <span className="param-label">{label}</span>
        <span className="param-value">{fmt(value, decimals)}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {source && (
        <a className="param-source" href={source.url} target="_blank" rel="noreferrer">
          {source.label}
        </a>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CUSTOM CHART TOOLTIP — consistent brand styling for both bar charts
   ═══════════════════════════════════════════════════════════════════════════ */
function ChartTooltip({ active, payload, label, suffix = "" }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">Return period {label}</div>
      <div className="chart-tooltip-val">USD {fmt(val, val < 100 ? 2 : 0)}{suffix}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUMMARY ROW — one line in the sidebar summary block
   ═══════════════════════════════════════════════════════════════════════════ */
function SumRow({ label, value, bold = false }) {
  return (
    <div className={`sum-row${bold ? " sum-row--bold" : ""}`}>
      <span className="sum-label">{label}</span>
      <span className="sum-value">{value}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CALCULATOR — main component
   All financial state and derived values live here. The layout is:
     [ sidebar: parameters + summary ] [ main: table + 2 charts ]
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Calculator() {

  /* ── User inputs ───────────────────────────────────────────────────────── */
  const [nPers,      setNPers]      = useState(1000);  // persons covered
  const [cbMult,     setCbMult]     = useState(3.0);   // cat bond premium multiple × EAL
  const [tbond,      setTbond]      = useState(0.40);  // Swiss T-bond yield %
  const [riMult,     setRiMult]     = useState(2.0);   // reinsurance premium multiple × EAL
  const [agriCost,   setAgriCost]   = useState(60);    // climate smart agri USD/person/yr
  const [othersCost, setOthersCost] = useState(30);    // others USD/person/yr
  const [usdChf,     setUsdChf]     = useState(0.79);  // USD → CHF exchange rate

  /* ── Derived financial figures (2-year term, all persons) ─────────────── */
  const costs = useMemo(() => {
    const n  = nPers;
    const tb = tbond / 100;  // convert % to decimal for multiplication

    // 1:50 Cat bond layer ─────────────────────────────────────────────────
    // EAL = (1/50) × 2000 = USD 40/person/yr (actuarially fair pure premium)
    const eal50       = (1 / 50) * 2000;
    const cbPrincipal = 2000 * n;                   // ILS collateral locked up
    const cbPremium   = cbMult * eal50 * 2 * n;     // donor risk spread (2-year)
    const cbYield     = tb * 2000 * 2 * n;          // T-bond yield on collateral
    const cbTotal     = cbPrincipal + cbPremium + cbYield;

    // 1:20 Reinsurance layer ──────────────────────────────────────────────
    // EAL = (1/20) × 1500 = USD 75/person/yr
    const eal20        = (1 / 20) * 1500;
    const reinsPremium = riMult * eal20 * 2 * n;    // donor-paid premium (2-year)
    const reinsCoverage = 1500 * n;                 // max payout face value

    // Other funding layers ────────────────────────────────────────────────
    const agri   = agriCost   * n * 2;
    const others = othersCost * n * 2;

    // Aggregate donor cost (Graph 1 scope: CB premium + reins + agri + others)
    const donorTotal = cbPremium + reinsPremium + agri + others;
    const adminChf   = 0.04 * donorTotal * usdChf;  // 4% management fee in CHF

    return { cbPrincipal, cbPremium, cbYield, cbTotal,
             reinsPremium, reinsCoverage, donorTotal, adminChf };
  }, [nPers, cbMult, tbond, riMult, agriCost, othersCost, usdChf]);

  /* ── Risk table rows (static schedule + n_pers scaling) ─────────────── */
  const tableRows = SCHEDULE.map((r) => ({
    ...r,
    totalPayout: r.payout * nPers,
    totalEal:    r.eal    * nPers,
  }));

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{CSS}</style>

      <div className="root">

        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-inner">

            <div className="sidebar-header">
              <div className="sidebar-logo">CAT BOND</div>
              <h1 className="sidebar-title">Cost Calculator</h1>
              <p className="sidebar-sub">Dual-Rail Humanitarian Parametric Insurance</p>
            </div>

            {/* Programme scale */}
            <section className="section">
              <div className="section-title">Programme scale</div>
              <div className="param">
                <div className="param-header">
                  <span className="param-label">Persons covered</span>
                  <span className="param-value">{fmt(nPers)}</span>
                </div>
                <input
                  className="num-input" type="number" min="1" step="100"
                  value={nPers} onChange={(e) => setNPers(Math.max(1, Number(e.target.value)))}
                />
              </div>
            </section>

            {/* Cat Bond */}
            <section className="section">
              <div className="section-title">Cat Bond — 1:50 layer</div>
              <Slider
                label="Risk premium multiple" value={cbMult} unit="× EAL"
                min={1.5} max={5.0} step={0.1} onChange={setCbMult}
                source={{ url: "https://www.artemis.bm/news/ils-market-conditions-report-q4-2025/", label: "Artemis Q4 2025 ILS Market Report" }}
              />
              <Slider
                label="Swiss T-bond yield" value={tbond} unit=" %"
                min={0} max={0.9} step={0.05} onChange={setTbond}
                source={{ url: "https://tradingeconomics.com/switzerland/government-bond-yield", label: "SNB / Trading Economics, March 2026" }}
              />
            </section>

            {/* Reinsurance */}
            <section className="section">
              <div className="section-title">Reinsurance — 1:20 layer</div>
              <Slider
                label="Premium multiple" value={riMult} unit="× EAL"
                min={1.0} max={3.5} step={0.1} onChange={setRiMult}
                source={{ url: "https://www.swissre.com/institute/research/topics-and-risk-dialogues/climate-and-natural-catastrophe-risk/expertise-publication-re-thinking-parametric-insurance.html", label: "Swiss Re parametric market data" }}
              />
            </section>

            {/* Funding layers */}
            <section className="section">
              <div className="section-title">Funding layers (USD / person / yr)</div>
              <Slider
                label="Climate Smart Agri" value={agriCost} unit=" USD"
                min={10} max={150} step={5} onChange={setAgriCost}
                source={{ url: "https://oneacrefund.org/documents/one-acre-fund-2024-annual-report/", label: "One Acre Fund 2024 — $300/farmer ÷ 5" }}
              />
              <Slider
                label="Others (savings / solidarity)" value={othersCost} unit=" USD"
                min={0} max={70} step={5} onChange={setOthersCost}
              />
            </section>

            {/* Currency */}
            <section className="section">
              <div className="section-title">Currency</div>
              <Slider
                label="USD / CHF rate" value={usdChf} unit=""
                min={0.67} max={0.95} step={0.01} onChange={setUsdChf}
                source={{ url: "https://tradingeconomics.com/usdchf:cur", label: "Trading Economics, March 2026" }}
              />
            </section>

            {/* Summary */}
            <section className="section section--summary">
              <div className="section-title">2-year totals — all {fmt(nPers)} persons</div>
              <SumRow label="Cat bond total"            value={fmtUSD(costs.cbTotal)}      bold />
              <SumRow label="  Principal (ILS)"         value={fmtUSD(costs.cbPrincipal)} />
              <SumRow label="  Risk premium (donor)"    value={fmtUSD(costs.cbPremium)} />
              <SumRow label="  Yield (T-bonds)"         value={fmtUSD(costs.cbYield)} />
              <SumRow label="Reinsurance premium"       value={fmtUSD(costs.reinsPremium)} />
              <SumRow label="Reinsurance coverage"      value={fmtUSD(costs.reinsCoverage)} />
              <SumRow label="Total donor cost"          value={fmtUSD(costs.donorTotal)}   bold />
              <SumRow label="Admin fee 4% (CHF)"        value={fmtCHF(costs.adminChf)} />
            </section>

          </div>
        </aside>

        {/* ── Main panel ── */}
        <main className="main">

          {/* Risk schedule table */}
          <section className="card">
            <h2 className="card-title">Risk schedule</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Return period</th>
                    <th>Probability</th>
                    <th>Payout / person</th>
                    <th>EAL / person / yr</th>
                    <th>Total payout</th>
                    <th>Total EAL / yr</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r) => (
                    <tr key={r.label}>
                      <td>
                        <span className="rp-pill" style={{ background: RP_COLOR[r.label] }}>
                          {r.label}
                        </span>
                      </td>
                      <td className="td-num">{fmtPct(r.prob)}</td>
                      <td className="td-num">USD {fmt(r.payout)}</td>
                      <td className="td-num">USD {fmt(r.eal, 2)}</td>
                      <td className="td-num td-total">USD {fmt(r.totalPayout)}</td>
                      <td className="td-num td-total">USD {fmt(r.totalEal, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Charts row */}
          <div className="charts">

            <section className="card chart-card">
              <h2 className="card-title">Payout per person if event occurs</h2>
              <p className="card-sub">Contractual transfer amount — no probability weighting</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={SCHEDULE} margin={{ top: 4, right: 12, bottom: 0, left: 8 }} barCategoryGap="35%">
                  <CartesianGrid vertical={false} stroke={C.parchment} strokeDasharray="0" />
                  <XAxis
                    dataKey="label" axisLine={false} tickLine={false}
                    tick={{ fill: C.slate, fontSize: 13, fontFamily: "Inter" }}
                  />
                  <YAxis
                    axisLine={false} tickLine={false}
                    tick={{ fill: C.slate, fontSize: 12, fontFamily: "Inter" }}
                    tickFormatter={(v) => v >= 1000 ? `$${v / 1000}k` : `$${v}`}
                    width={44}
                  />
                  <Tooltip
                    content={<ChartTooltip suffix=" / person" />}
                    cursor={{ fill: C.petal, radius: 4 }}
                  />
                  <Bar dataKey="payout" radius={[5, 5, 0, 0]}>
                    {SCHEDULE.map((r) => (
                      <Cell key={r.label} fill={RP_COLOR[r.label]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </section>

            <section className="card chart-card">
              <h2 className="card-title">Expected Annual Loss per person</h2>
              <p className="card-sub">Actuarially fair premium = probability × payout</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={SCHEDULE} margin={{ top: 4, right: 12, bottom: 0, left: 8 }} barCategoryGap="35%">
                  <CartesianGrid vertical={false} stroke={C.parchment} strokeDasharray="0" />
                  <XAxis
                    dataKey="label" axisLine={false} tickLine={false}
                    tick={{ fill: C.slate, fontSize: 13, fontFamily: "Inter" }}
                  />
                  <YAxis
                    axisLine={false} tickLine={false}
                    tick={{ fill: C.slate, fontSize: 12, fontFamily: "Inter" }}
                    tickFormatter={(v) => `$${v}`}
                    width={44}
                  />
                  <Tooltip
                    content={<ChartTooltip suffix=" / person / yr" />}
                    cursor={{ fill: C.petal, radius: 4 }}
                  />
                  <Bar dataKey="eal" radius={[5, 5, 0, 0]}>
                    {SCHEDULE.map((r) => (
                      <Cell key={r.label} fill={RP_COLOR[r.label]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </section>

          </div>{/* /charts */}

        </main>
      </div>{/* /root */}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CSS — injected as a <style> tag so the component is fully self-contained
   (same pattern as catbond-diagram.jsx)
   ═══════════════════════════════════════════════════════════════════════════ */
const CSS = `
  /* ── Reset & base ────────────────────────────────────────────────────── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${C.chalk};
    color: ${C.jet};
    font-family: "Inter", system-ui, -apple-system, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  /* ── App shell: sidebar + main ──────────────────────────────────────── */
  .root {
    display: flex;
    min-height: 100vh;
  }

  /* ── Sidebar ─────────────────────────────────────────────────────────── */
  .sidebar {
    width: 296px;
    flex-shrink: 0;
    background: ${C.white};
    border-right: 1px solid ${C.parchment};
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: ${C.parchment} transparent;
  }
  .sidebar-inner {
    padding: 28px 20px 40px;
  }
  .sidebar-header {
    margin-bottom: 24px;
  }
  .sidebar-logo {
    display: inline-block;
    background: ${C.midnight};
    color: ${C.white};
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    padding: 3px 8px;
    border-radius: 4px;
    margin-bottom: 8px;
  }
  .sidebar-title {
    font-size: 20px;
    font-weight: 700;
    color: ${C.midnight};
    line-height: 1.2;
  }
  .sidebar-sub {
    font-size: 11px;
    color: ${C.slate};
    margin-top: 4px;
    line-height: 1.4;
  }

  /* ── Sections ────────────────────────────────────────────────────────── */
  .section {
    margin-bottom: 22px;
    padding-bottom: 22px;
    border-bottom: 1px solid ${C.parchment};
  }
  .section:last-child { border-bottom: none; margin-bottom: 0; }
  .section-title {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: ${C.slate};
    margin-bottom: 14px;
  }

  /* ── Parameters ──────────────────────────────────────────────────────── */
  .param { margin-bottom: 14px; }
  .param:last-child { margin-bottom: 0; }
  .param-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 5px;
  }
  .param-label {
    font-size: 13px;
    color: ${C.jet};
  }
  .param-value {
    font-size: 13px;
    font-weight: 700;
    color: ${C.violet};
    min-width: 52px;
    text-align: right;
  }
  input[type=range] {
    width: 100%;
    height: 4px;
    accent-color: ${C.violet};
    cursor: pointer;
    margin-bottom: 4px;
  }
  .num-input {
    width: 100%;
    padding: 7px 10px;
    border: 1px solid ${C.parchment};
    border-radius: 7px;
    font-size: 14px;
    font-family: inherit;
    color: ${C.jet};
    background: ${C.chalk};
    transition: border-color 0.15s;
  }
  .num-input:focus {
    outline: none;
    border-color: ${C.violet};
  }
  .param-source {
    font-size: 11px;
    color: ${C.slate};
    text-decoration: none;
    opacity: 0.65;
    display: inline-block;
  }
  .param-source:hover { opacity: 1; text-decoration: underline; }

  /* ── Summary ─────────────────────────────────────────────────────────── */
  .section--summary { background: ${C.chalk}; border-radius: 10px; padding: 14px 14px 10px; border: none; margin-top: 4px; }
  .sum-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 5px 0;
    border-bottom: 1px solid ${C.parchment};
    gap: 8px;
  }
  .sum-row:last-child { border-bottom: none; }
  .sum-row--bold .sum-label { font-weight: 600; color: ${C.midnight}; }
  .sum-row--bold .sum-value { color: ${C.violet}; }
  .sum-label {
    font-size: 12px;
    color: ${C.slate};
    line-height: 1.3;
  }
  .sum-value {
    font-size: 12px;
    font-weight: 500;
    color: ${C.midnight};
    white-space: nowrap;
  }

  /* ── Main panel ──────────────────────────────────────────────────────── */
  .main {
    flex: 1;
    min-width: 0;
    padding: 36px 36px 48px;
    background: ${C.chalk};
  }

  /* ── Cards ────────────────────────────────────────────────────────────── */
  .card {
    background: ${C.white};
    border: 1px solid ${C.parchment};
    border-radius: 14px;
    padding: 24px 28px;
    margin-bottom: 24px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  .card-title {
    font-size: 15px;
    font-weight: 700;
    color: ${C.midnight};
    margin-bottom: 4px;
  }
  .card-sub {
    font-size: 12px;
    color: ${C.slate};
    margin-bottom: 18px;
  }

  /* ── Table ─────────────────────────────────────────────────────────────── */
  .table-wrap { overflow-x: auto; }
  .table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
  }
  .table thead tr {
    border-bottom: 2px solid ${C.parchment};
  }
  .table th {
    text-align: left;
    padding: 0 16px 10px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: ${C.slate};
    white-space: nowrap;
  }
  .table td {
    padding: 11px 16px;
    border-bottom: 1px solid ${C.parchment};
    vertical-align: middle;
  }
  .table tbody tr:last-child td { border-bottom: none; }
  .table tbody tr:hover td { background: ${C.chalk}; }
  .td-num { font-variant-numeric: tabular-nums; text-align: right; }
  .td-total { font-weight: 600; color: ${C.midnight}; }

  /* Return-period colored pill */
  .rp-pill {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 700;
    color: ${C.white};
    letter-spacing: 0.03em;
  }

  /* ── Charts grid ─────────────────────────────────────────────────────── */
  .charts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  .chart-card { margin-bottom: 0; }

  /* ── Recharts tooltip ─────────────────────────────────────────────────── */
  .chart-tooltip {
    background: ${C.white};
    border: 1px solid ${C.parchment};
    border-radius: 8px;
    padding: 10px 14px;
    font-family: "Inter", sans-serif;
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  }
  .chart-tooltip-title {
    font-size: 12px;
    font-weight: 600;
    color: ${C.midnight};
    margin-bottom: 3px;
  }
  .chart-tooltip-val {
    font-size: 14px;
    font-weight: 700;
    color: ${C.violet};
  }

  /* ── Responsive ──────────────────────────────────────────────────────── */
  @media (max-width: 900px) {
    .root { flex-direction: column; }
    .sidebar {
      width: 100%;
      height: auto;
      position: static;
      border-right: none;
      border-bottom: 1px solid ${C.parchment};
    }
    .main { padding: 20px 16px 36px; }
    .charts { grid-template-columns: 1fr; }
    .card { padding: 18px 16px; }
  }

  @media (max-width: 480px) {
    .sidebar-inner { padding: 20px 16px 28px; }
    .table th, .table td { padding: 8px 10px; }
  }
`;
