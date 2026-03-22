import { useState, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════════════════════════════════ */
const T = {
  bg:       "#EDE8DF",
  surface:  "#FFFFFF",
  raised:   "#F5F1EA",
  border:   "#D9D3C8",
  borderHi: "#B8B0A2",
  ink:  "#1C1917",
  mid:  "#57534E",
  dim:  "#9C958C",
  teal:      "#0D9488",  tealSoft:   "#99F6E4",  tealBg:    "#F0FDFA",
  indigo:    "#4338CA",  indigoSoft: "#C7D2FE",  indigoBg:  "#EEF2FF",
  amber:     "#B45309",  amberSoft:  "#FDE68A",  amberBg:   "#FFFBEB",
  violet:    "#7C3AED",  violetSoft: "#DDD6FE",  violetBg:  "#F5F3FF",
  rose:      "#BE123C",  roseSoft:   "#FECDD3",  roseBg:    "#FFF1F2",
};

const NW  = 190;
const NH  = 72;
const NHH = 90;
const BAR = 7;
const NR  = 13;
const CANVAS_H = 1040;
const CANVAS_W = 960;

const SANS  = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

/* ═══════════════════════════════════════════════════════════════════════════
   NODE METADATA
   ═══════════════════════════════════════════════════════════════════════════ */
const NODES = {
  collateral: {
    title: "Collateral Pool",  sub: "T-Bills · Tokenized MMF",
    c: T.teal, soft: T.tealSoft, bg: T.tealBg,
    desc: "The bond principal sits here for the full term — split between traditional T-bills and tokenized money market funds. Auditable by both fiat custodians and on-chain counterparties.",
  },
  oracle: {
    title: "Parametric Oracle",  sub: "USGS · NOAA · Chainlink",
    c: T.indigo, soft: T.indigoSoft, bg: T.indigoBg,
    desc: "Authoritative event data published on-chain by tamper-proof oracle networks. Removing a central data intermediary eliminates trigger manipulation risk.",
  },
  sponsors: {
    title: "Risk Sponsors",  sub: "IFRC · World Bank · ODA",
    c: T.amber, soft: T.amberSoft, bg: T.amberBg,
    desc: "Institutional donors and DFIs pay the risk premium to transfer catastrophe exposure. On trigger, payouts go directly to beneficiaries.",
  },
  spv: {
    title: "SPV",  sub: "Cayman · Bermuda",
    c: T.teal, soft: T.tealSoft, bg: T.tealBg,
    desc: "The Special Purpose Vehicle simultaneously issues ISIN notes (fiat tranche) and ERC-3643 tokens (token tranche) against the same collateral pool — one entity, two rails.",
    hero: true,
  },
  calcagent: {
    title: "Calculation Agent",  sub: "Trigger certification",
    c: T.indigo, soft: T.indigoSoft, bg: T.indigoBg,
    desc: "A licensed third party certifies whether the parametric index has crossed the threshold. Their attestation is binding for both the fiat indenture and the smart contract.",
  },
  humanitarian: {
    title: "Humanitarian Wallet",  sub: "IFRC · WFP · Nat. Society",
    c: T.rose, soft: T.roseSoft, bg: T.roseBg,
    desc: "A pre-authorised wallet. On trigger: a fiat wire and a stablecoin transfer both arrive here simultaneously — from the paying agent and the smart contract.",
  },
  fiat_investors: {
    title: "Fiat Tranche",  sub: "ISIN/CUSIP · Min $100k",
    c: T.amber, soft: T.amberSoft, bg: T.amberBg,
    desc: "Traditional institutional notes. Settlement via DTCC/Euroclear, quarterly coupon by wire. For pension funds, DFIs, and family offices.",
    rail: "fiat",
  },
  token_investors: {
    title: "Token Tranche",  sub: "ERC-3643 · Min $100",
    c: T.violet, soft: T.violetSoft, bg: T.violetBg,
    desc: "Compliant security tokens. KYC/AML embedded in transfer logic. Coupons in USDC. Opens the bond to crypto-native impact investors.",
    rail: "crypto",
  },
  mno: {
    title: "MNO",  sub: "Mobile Network Operator",
    c: T.indigo, soft: T.indigoSoft, bg: T.indigoBg,
    desc: "The Mobile Network Operator (e.g. MTN, Orange, Airtel) that operates the mobile money platform. Handles targeting, KYC, transfer execution, customer care, and manages the agent network.",
  },
  person: {
    title: "Recipient",  sub: "Person living in the affected area",
    c: T.rose, soft: T.roseSoft, bg: T.roseBg,
    desc: "The individual receiving the payout on their mobile wallet. Gives consent, completes KYC, receives funds digitally, and can spend or cash out via a local MNO agent.",
  },
  mno_agent: {
    title: "MNO Agent",  sub: "Mobile money cash-out",
    c: T.rose, soft: T.roseSoft, bg: T.roseBg,
    desc: "A local mobile money agent providing cash-out services. Maintains e-float to convert digital balances to physical cash on demand.",
  },
  super_agent: {
    title: "Super Agent",  sub: "Agent network manager",
    c: T.indigo, soft: T.indigoSoft, bg: T.indigoBg,
    desc: "Manages and supplies a network of MNO agents. Responsible for e-float distribution, agent onboarding, and reconciliation with the mobile money platform.",
  },
  bank: {
    title: "Commercial Bank",  sub: "Super agent settlement",
    c: T.indigo, soft: T.indigoSoft, bg: T.indigoBg,
    desc: "Holds the super agent's settlement account and e-float liquidity pool. Bridges the mobile money ecosystem with the broader financial system.",
  },
  central_bank: {
    title: "Central Bank",  sub: "Regulator · Oversight",
    c: T.amber, soft: T.amberSoft, bg: T.amberBg,
    desc: "The national monetary authority that licenses and regulates the mobile money ecosystem and provides oversight of the commercial banks in the payout infrastructure.",
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   POSITION SETS
   NORTH_POS — financial structure at top  (Global North / investor view)
   SOUTH_POS — payout chain at top         (Global South / recipient view, default)
   SOUTH_POS is computed by flipping each node's y: y_south = CANVAS_H - y_north - h
   ═══════════════════════════════════════════════════════════════════════════ */
const NORTH_POS = {
  collateral:      { x: 370, y: 34  },
  oracle:          { x: 710, y: 34  },
  sponsors:        { x: 24,  y: 234 },
  spv:             { x: 370, y: 222 },
  calcagent:       { x: 710, y: 234 },
  humanitarian:    { x: 24,  y: 440 },
  fiat_investors:  { x: 370, y: 440 },
  token_investors: { x: 710, y: 440 },
  mno:             { x: 266, y: 590 },
  person:          { x: 24,  y: 590 },
  mno_agent:       { x: 266, y: 740 },
  super_agent:     { x: 24,  y: 890 },
  bank:            { x: 266, y: 890 },
  central_bank:    { x: 508, y: 890 },
};

// SOUTH_POS — Global South / recipient perspective (default view)
// Layout matches user-arranged screenshot: payout chain flows top→bottom
// on the left; financial structure on the right; SPV anchors the bottom.
const SOUTH_POS = {
  // ── Row 1: Recipient (top, partially visible) ─────────────────────
  person:          { x: 370, y: 24  },
  // ── Row 1b: MNO Agent (top-left, first-mile cash-out) ────────────
  mno_agent:       { x: 74,  y: 51  },
  // ── Row 2: payout + settlement + investor layer ───────────────────
  super_agent:     { x: 74,  y: 243 },
  bank:            { x: 317, y: 243 },
  mno:             { x: 557, y: 243 },
  sponsors:        { x: 757, y: 243 },
  // ── Row 3: humanitarian wallet + investor tranches ────────────────
  humanitarian:    { x: 557, y: 371 },
  token_investors: { x: 757, y: 305 },
  fiat_investors:  { x: 757, y: 435 },
  // ── Row 4: oversight ─────────────────────────────────────────────
  central_bank:    { x: 74,  y: 432 },
  // ── Row 5: oracle ─────────────────────────────────────────────────
  oracle:          { x: 288, y: 544 },
  // ── Row 6: collateral pool ────────────────────────────────────────
  collateral:      { x: 532, y: 648 },
  // ── Row 7: SPV / calculation agent ───────────────────────────────
  calcagent:       { x: 317, y: 750 },
  spv:             { x: 680, y: 791 },
};

/* ═══════════════════════════════════════════════════════════════════════════
   EDGE DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════════ */
const EDGES = [
  { from: "sponsors",     to: "spv",             label: "Premium",           color: T.amber,  dash: false },
  { from: "spv",          to: "collateral",       label: "Principal",         color: T.teal,   dash: false },
  { from: "collateral",   to: "oracle",           label: "Monitoring",        color: T.indigo, dash: true  },
  { from: "oracle",       to: "calcagent",        label: "Data feed",         color: T.indigo, dash: false },
  { from: "calcagent",    to: "spv",              label: "Trigger confirmed", color: T.rose,   dash: false },
  { from: "spv",          to: "fiat_investors",   label: "Notes issued",      color: T.amber,  dash: false },
  { from: "spv",          to: "token_investors",  label: "Tokens minted",     color: T.violet, dash: false },
  { from: "spv",          to: "humanitarian",     label: "Payout on trigger", color: T.rose,   dash: true  },
  { from: "humanitarian", to: "mno",              label: "Disbursement",      color: T.rose,   dash: false },
  { from: "mno",          to: "person",           label: "Mobile payout",     color: T.rose,   dash: false },
  { from: "person",       to: "mno_agent",        label: "Cash-out",          color: T.rose,   dash: false },
  { from: "mno",          to: "mno_agent",        label: "Agent network",     color: T.indigo, dash: true  },
  { from: "mno_agent",    to: "super_agent",      label: "E-float mgmt",      color: T.indigo, dash: false },
  { from: "super_agent",  to: "bank",             label: "Settlement",        color: T.indigo, dash: false },
  { from: "bank",         to: "central_bank",     label: "Oversight",         color: T.amber,  dash: true  },
];

const MARKER = {
  [T.teal]:   "arr-teal",
  [T.indigo]: "arr-indigo",
  [T.amber]:  "arr-amber",
  [T.violet]: "arr-violet",
  [T.rose]:   "arr-rose",
};

/* Groups for dynamic zone bounding boxes */
const FINANCIAL_IDS = ["collateral","oracle","sponsors","spv","calcagent","fiat_investors","token_investors"];
const PAYOUT_IDS    = ["humanitarian","mno","person","mno_agent","super_agent","bank","central_bank"];

/** Compute bounding box with separate top padding for label headroom */
function nodeBounds(ids, pos, pad = 14, topPad = pad) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of ids) {
    const p = pos[id];
    if (!p) continue;
    const h = NODES[id]?.hero ? NHH : NH;
    minX = Math.min(minX, p.x);      minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + NW); maxY = Math.max(maxY, p.y + h);
  }
  return { x: minX - pad, y: minY - topPad, w: maxX - minX + pad * 2, h: maxY - minY + topPad + pad };
}

/* ═══════════════════════════════════════════════════════════════════════════
   EDGE PATH — cubic bezier, recomputed from live positions
   ═══════════════════════════════════════════════════════════════════════════ */
function edgePath(fromId, toId, pos) {
  const fp = pos[fromId];
  const tp = pos[toId];
  if (!fp || !tp) return { path: "", mx: 0, my: 0 };

  const fh = NODES[fromId]?.hero ? NHH : NH;
  const th = NODES[toId]?.hero   ? NHH : NH;
  const fc = { x: fp.x + NW / 2, y: fp.y + fh / 2 };
  const tc = { x: tp.x + NW / 2, y: tp.y + th / 2 };
  const dx = tc.x - fc.x;
  const dy = tc.y - fc.y;

  let x1, y1, x2, y2, path, mx, my;

  if (Math.abs(dx) >= Math.abs(dy) * 0.75) {
    if (dx >= 0) { x1 = fp.x + NW; y1 = fc.y; x2 = tp.x;      y2 = tc.y; }
    else          { x1 = fp.x;      y1 = fc.y; x2 = tp.x + NW; y2 = tc.y; }
    const cx = (x1 + x2) / 2;
    path = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
    mx = cx; my = (y1 + y2) / 2;
  } else {
    if (dy >= 0) { x1 = fc.x; y1 = fp.y + fh; x2 = tc.x; y2 = tp.y;      }
    else          { x1 = fc.x; y1 = fp.y;       x2 = tc.x; y2 = tp.y + th; }
    const cy = (y1 + y2) / 2;
    path = `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
    mx = (x1 + x2) / 2 + 6; my = cy;
  }
  return { path, mx, my };
}

/* ═══════════════════════════════════════════════════════════════════════════
   CSS
   ═══════════════════════════════════════════════════════════════════════════ */
const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .cbd-root {
    background: ${T.bg}; min-height: 100vh; font-family: ${SANS};
    color: ${T.ink}; padding: 40px 48px;
    display: flex; flex-direction: column; gap: 28px;
  }
  .cbd-header { border-bottom: 1px solid ${T.border}; padding-bottom: 24px; }
  .cbd-title-row { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin-bottom: 8px; }
  .cbd-h1 { font-family: ${SERIF}; font-size: 32px; color: ${T.teal}; font-weight: 700; letter-spacing: -0.01em; flex: 1; }
  .cbd-tag { font-size: 11px; color: ${T.dim}; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; }
  .cbd-subtitle { font-size: 16px; color: ${T.mid}; }

  /* ── View toggle button ──────────────────────────────────────────── */
  .cbd-toggle {
    display: inline-flex; align-items: center; gap: 9px;
    padding: 9px 20px; border: none; border-radius: 9px;
    font-family: ${SANS}; font-size: 12px; font-weight: 700;
    letter-spacing: 0.04em; cursor: pointer; flex-shrink: 0;
    transition: transform 0.18s, box-shadow 0.18s, background 0.4s;
    position: relative; overflow: hidden;
  }
  .cbd-toggle::after {
    content: ''; position: absolute; inset: 0; border-radius: 9px;
    background: rgba(255,255,255,0.12);
    opacity: 0; transition: opacity 0.18s;
  }
  .cbd-toggle:hover::after { opacity: 1; }
  .cbd-toggle:hover { transform: translateY(-2px); }
  .cbd-toggle:active { transform: translateY(0); }

  .cbd-toggle--south {
    background: linear-gradient(135deg, #BE123C 0%, #9F1239 50%, #7C3AED 100%);
    color: #fff;
    box-shadow: 0 4px 18px #BE123C50;
    animation: glow-south 2.8s ease-in-out infinite;
  }
  @keyframes glow-south {
    0%, 100% { box-shadow: 0 4px 18px #BE123C50; }
    50%       { box-shadow: 0 6px 28px #BE123C80, 0 0 0 3px #BE123C20; }
  }
  .cbd-toggle--north {
    background: linear-gradient(135deg, #0D9488 0%, #4338CA 60%, #7C3AED 100%);
    color: #fff;
    box-shadow: 0 4px 18px #4338CA50;
    animation: glow-north 2.8s ease-in-out infinite;
  }
  @keyframes glow-north {
    0%, 100% { box-shadow: 0 4px 18px #4338CA50; }
    50%       { box-shadow: 0 6px 28px #4338CA80, 0 0 0 3px #4338CA20; }
  }
  .cbd-toggle-icon { font-size: 16px; transition: transform 0.4s; display: inline-block; }
  .cbd-toggle--north .cbd-toggle-icon { transform: rotate(180deg); }

  /* ── Tabs ────────────────────────────────────────────────────────── */
  .cbd-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
  .cbd-tab {
    background: transparent; border: 1px solid ${T.border};
    color: ${T.mid}; padding: 9px 24px; border-radius: 9px;
    font-size: 14px; cursor: pointer; letter-spacing: 0.05em;
    text-transform: uppercase; font-family: ${SANS}; font-weight: 500;
    transition: border-color 0.15s, color 0.15s, background 0.15s, box-shadow 0.15s;
  }
  .cbd-tab:hover { border-color: ${T.borderHi}; color: ${T.ink}; }
  .cbd-tab--active {
    background: ${T.surface}; border-color: ${T.teal}; color: ${T.teal};
    font-weight: 600; box-shadow: 0 1px 4px ${T.teal}22;
  }

  /* ── Structure ───────────────────────────────────────────────────── */
  .cbd-structure { display: flex; gap: 24px; align-items: flex-start; }
  .cbd-svg-wrap {
    flex: 1; min-width: 0; overflow: auto; border-radius: 16px;
    border: 1px solid ${T.border}; box-shadow: 0 2px 16px #1C191712;
  }
  .cbd-svg { display: block; min-width: 640px; width: 100%; }

  /* ── Info panel ──────────────────────────────────────────────────── */
  .cbd-panel { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 14px; }
  .cbd-card {
    background: ${T.surface}; border: 1px solid ${T.border};
    border-radius: 14px; padding: 22px; box-shadow: 0 1px 4px #1C191708;
    transition: border-color 0.2s;
  }
  .cbd-card--hint { color: ${T.dim}; font-size: 15px; text-align: center; padding: 32px 22px; line-height: 1.6; }
  .cbd-card-eyebrow { font-size: 11px; color: ${T.dim}; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; margin-bottom: 10px; }
  .cbd-card-title { font-family: ${SERIF}; font-size: 22px; font-weight: 700; margin-bottom: 5px; line-height: 1.2; }
  .cbd-card-sub { font-size: 13px; color: ${T.mid}; margin-bottom: 16px; }
  .cbd-card-desc { font-size: 14px; color: ${T.mid}; line-height: 1.75; }
  .cbd-drag-hint { font-size: 12px; color: ${T.dim}; text-align: center; padding: 12px 16px; border-radius: 9px; border: 1px dashed ${T.border}; line-height: 1.5; }
  .cbd-legend { background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 14px; padding: 20px; box-shadow: 0 1px 4px #1C191708; }
  .cbd-legend-title { font-size: 11px; color: ${T.dim}; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; margin-bottom: 14px; }
  .cbd-legend-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 13px; color: ${T.mid}; }
  .cbd-legend-dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; }
  .cbd-legend-dash { width: 26px; height: 0; border-top: 2px dashed ${T.borderHi}; flex-shrink: 0; }

  /* ── Rails ───────────────────────────────────────────────────────── */
  .cbd-rails { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
  .cbd-rail-card { border: 1px solid ${T.border}; border-radius: 16px; padding: 32px; box-shadow: 0 1px 6px #1C191706; }
  .cbd-rail-title { font-family: ${SERIF}; font-size: 26px; font-weight: 700; margin-bottom: 24px; }
  .cbd-rail-row { display: flex; justify-content: space-between; align-items: baseline; padding: 12px 0; border-bottom: 1px solid ${T.border}; gap: 16px; }
  .cbd-rail-row:last-child { border-bottom: none; }
  .cbd-rail-key { font-size: 12px; color: ${T.dim}; text-transform: uppercase; letter-spacing: 0.06em; flex-shrink: 0; }
  .cbd-rail-val { font-size: 15px; color: ${T.ink}; text-align: right; }

  /* ── Trigger ─────────────────────────────────────────────────────── */
  .cbd-trigger { display: flex; flex-direction: column; gap: 14px; }
  .cbd-trigger-intro { font-size: 16px; color: ${T.mid}; margin-bottom: 6px; }
  .cbd-step {
    display: flex; gap: 24px; align-items: flex-start; padding: 22px 26px;
    background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 14px;
    box-shadow: 0 1px 4px #1C191705; transition: border-color 0.15s, box-shadow 0.15s;
  }
  .cbd-step:hover { border-color: ${T.borderHi}; box-shadow: 0 3px 12px #1C191712; }
  .cbd-step-n { font-family: ${SERIF}; font-size: 36px; opacity: 0.18; line-height: 1; flex-shrink: 0; font-weight: 700; min-width: 44px; }
  .cbd-step-title { font-size: 18px; font-weight: 600; margin-bottom: 7px; }
  .cbd-step-desc { font-size: 14px; color: ${T.mid}; line-height: 1.7; }

  /* ── Footer ──────────────────────────────────────────────────────── */
  .cbd-footer { font-size: 12px; color: ${T.dim}; border-top: 1px solid ${T.border}; padding-top: 16px; }

  /* ── Responsive ──────────────────────────────────────────────────── */
  @media (max-width: 1024px) {
    .cbd-root { padding: 28px 28px; }
    .cbd-panel { width: 260px; }
  }
  @media (max-width: 820px) {
    .cbd-root { padding: 20px; gap: 18px; }
    .cbd-h1 { font-size: 22px; }
    .cbd-subtitle { font-size: 14px; }
    .cbd-structure { flex-direction: column; }
    .cbd-panel { width: 100%; flex-direction: row; flex-wrap: wrap; }
    .cbd-card, .cbd-legend { flex: 1; min-width: 220px; }
    .cbd-rails { grid-template-columns: 1fr; }
  }
  @media (max-width: 480px) {
    .cbd-root { padding: 14px; }
    .cbd-panel { flex-direction: column; }
    .cbd-card, .cbd-legend { min-width: unset; }
    .cbd-title-row { flex-direction: column; align-items: flex-start; }
  }
`;

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function CatBondDiagram() {
  const [sel, setSel]   = useState(null);
  const [tab, setTab]   = useState("structure");
  // "south" = recipient at top (default); "north" = SPV/finance at top
  const [view, setView] = useState("south");
  const [pos, setPos]   = useState(SOUTH_POS);
  const [drag, setDrag] = useState(false);

  const svgRef  = useRef(null);
  const dragRef = useRef(null);
  const animRef = useRef(null);
  // posRef stays in sync with pos for animation start-point reads
  const posRef  = useRef(SOUTH_POS);

  const node = NODES[sel];
  const pick = (id) => { if (!dragRef.current) setSel(sel === id ? null : id); };

  /* Keep posRef in sync whenever we update pos */
  function updatePos(next) { posRef.current = next; setPos(next); }

  /* SVG coordinate conversion (handles viewBox scaling) */
  function svgCoord(e) {
    const svg = svgRef.current;
    const pt  = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  /* Drag handlers */
  function onNodeMouseDown(e, id) {
    e.stopPropagation();
    const { x, y } = svgCoord(e);
    dragRef.current = { id, ox: x - pos[id].x, oy: y - pos[id].y };
    setDrag(true);
  }
  function onMouseMove(e) {
    if (!dragRef.current) return;
    const { id, ox, oy } = dragRef.current;
    const { x, y } = svgCoord(e);
    updatePos({ ...posRef.current, [id]: { x: x - ox, y: y - oy } });
  }
  function onMouseUp() { dragRef.current = null; setDrag(false); }

  /* Touch handlers */
  function onNodeTouchStart(e, id) {
    e.preventDefault();
    const t = e.touches[0];
    const svg = svgRef.current;
    const pt  = svg.createSVGPoint();
    pt.x = t.clientX; pt.y = t.clientY;
    const { x, y } = pt.matrixTransform(svg.getScreenCTM().inverse());
    dragRef.current = { id, ox: x - pos[id].x, oy: y - pos[id].y };
  }
  function onTouchMove(e) {
    if (!dragRef.current) return;
    e.preventDefault();
    const t   = e.touches[0];
    const svg = svgRef.current;
    const pt  = svg.createSVGPoint();
    pt.x = t.clientX; pt.y = t.clientY;
    const { x, y } = pt.matrixTransform(svg.getScreenCTM().inverse());
    const { id, ox, oy } = dragRef.current;
    updatePos({ ...posRef.current, [id]: { x: x - ox, y: y - oy } });
  }

  /* Animated transition between NORTH_POS and SOUTH_POS */
  const animateTo = useCallback((targetPos) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const startPos  = { ...posRef.current };
    const startTime = performance.now();
    const duration  = 700;

    function frame(now) {
      const raw = Math.min((now - startTime) / duration, 1);
      // Ease in-out cubic
      const t = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
      const next = {};
      for (const id of Object.keys(targetPos)) {
        next[id] = {
          x: startPos[id].x + (targetPos[id].x - startPos[id].x) * t,
          y: startPos[id].y + (targetPos[id].y - startPos[id].y) * t,
        };
      }
      updatePos(next);
      if (raw < 1) animRef.current = requestAnimationFrame(frame);
    }
    animRef.current = requestAnimationFrame(frame);
  }, []);

  function handleToggle() {
    const next = view === "south" ? "north" : "south";
    setView(next);
    animateTo(next === "north" ? NORTH_POS : SOUTH_POS);
  }

  /* Dynamic zone bounds computed from live positions */
  const finBounds = nodeBounds(FINANCIAL_IDS, pos, 14, 28);
  // topPad=44 gives the "PAYOUT CHAIN" label clear headroom above the Recipient node
  const payBounds = nodeBounds(PAYOUT_IDS, pos, 14, 44);
  // Fiat and crypto zones are tighter — just around their investor nodes
  const fiatBounds = nodeBounds(["fiat_investors"], pos, 10);
  const cryptoBounds = nodeBounds(["token_investors"], pos, 10);

  return (
    <>
      <style>{CSS}</style>
      <div className="cbd-root">

        {/* ── Header ────────────────────────────────────────────────── */}
        <header className="cbd-header">
          <div className="cbd-title-row">
            <h1 className="cbd-h1">Dual-Rail Humanitarian Cat Bond</h1>
            <button
              className={`cbd-toggle cbd-toggle--${view}`}
              onClick={handleToggle}
              style={tab !== "structure" ? { visibility: "hidden" } : undefined}
            >
              <span className="cbd-toggle-icon">⇅</span>
              {view === "south" ? "Global North View" : "Global South View"}
            </button>
          </div>
          <p className="cbd-subtitle">
            Single SPV · Fiat + Tokenised tranches · Automated payout to recipients
          </p>
        </header>

        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <nav className="cbd-tabs">
          {["structure", "rails", "trigger"].map(v => (
            <button key={v}
              className={`cbd-tab${tab === v ? " cbd-tab--active" : ""}`}
              onClick={() => setTab(v)}>
              {v}
            </button>
          ))}
        </nav>

        {/* ══════════════════════════════════════════════════════════════
            STRUCTURE TAB
            ══════════════════════════════════════════════════════════════ */}
        {tab === "structure" && (
          <div className="cbd-structure">
            <div className="cbd-svg-wrap">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                className="cbd-svg"
                style={{ cursor: drag ? "grabbing" : "default" }}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onTouchMove={onTouchMove}
                onTouchEnd={onMouseUp}
              >
                <defs>
                  <linearGradient id="canvas-bg" x1="0" y1="0" x2="0.3" y2="1">
                    <stop offset="0%"   stopColor="#F5F0E8" />
                    <stop offset="100%" stopColor="#E5DDD0" />
                  </linearGradient>
                  <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
                    <circle cx="1.5" cy="1.5" r="1.2" fill={T.borderHi} opacity="0.4" />
                  </pattern>
                  <filter id="sh" x="-12%" y="-12%" width="124%" height="136%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1C191714" />
                  </filter>
                  <filter id="sh-hero" x="-18%" y="-18%" width="136%" height="148%">
                    <feDropShadow dx="0" dy="5" stdDeviation="8" floodColor={T.teal + "30"} />
                  </filter>
                  {[["arr-teal", T.teal], ["arr-indigo", T.indigo],
                    ["arr-amber", T.amber], ["arr-violet", T.violet], ["arr-rose", T.rose]
                  ].map(([id, c]) => (
                    <marker key={id} id={id} markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
                      <path d="M0,0.5 L0,6.5 L7,3.5 z" fill={c} opacity="0.82" />
                    </marker>
                  ))}
                </defs>

                {/* Canvas */}
                <rect width={CANVAS_W} height={CANVAS_H} fill="url(#canvas-bg)" rx="13" />
                <rect width={CANVAS_W} height={CANVAS_H} fill="url(#dots)" rx="13" />

                {/* ── Dynamic zone backgrounds (animate with nodes) ── */}
                {/* Financial structure */}
                <rect x={finBounds.x} y={finBounds.y} width={finBounds.w} height={finBounds.h} rx="12"
                  fill={T.tealBg} fillOpacity="0.35"
                  stroke={T.teal} strokeOpacity="0.12" strokeWidth="1" strokeDasharray="6,4" />
                <text x={finBounds.x + 14} y={finBounds.y + 22}
                  fill={T.teal} opacity="0.5" fontSize="12" fontFamily={SANS}
                  letterSpacing="0.08em" fontWeight="600">
                  FINANCIAL STRUCTURE
                </text>

                {/* Payout chain */}
                <rect x={payBounds.x} y={payBounds.y} width={payBounds.w} height={payBounds.h} rx="12"
                  fill={T.roseBg} fillOpacity="0.5"
                  stroke={T.rose} strokeOpacity="0.15" strokeWidth="1" strokeDasharray="6,4" />
                <text x={payBounds.x + 14} y={payBounds.y + 22}
                  fill={T.rose} opacity="0.5" fontSize="12" fontFamily={SANS}
                  letterSpacing="0.08em" fontWeight="600">
                  PAYOUT CHAIN
                </text>

                {/* Fiat rail */}
                <rect x={fiatBounds.x} y={fiatBounds.y} width={fiatBounds.w} height={fiatBounds.h} rx="10"
                  fill={T.amberBg} fillOpacity="0.8"
                  stroke={T.amber} strokeOpacity="0.2" strokeWidth="1" strokeDasharray="5,4" />
                <text x={fiatBounds.x + 10} y={fiatBounds.y + 17}
                  fill={T.amber} opacity="0.45" fontSize="10.5" fontFamily={SANS}
                  letterSpacing="0.08em" fontWeight="600">FIAT</text>

                {/* Crypto rail */}
                <rect x={cryptoBounds.x} y={cryptoBounds.y} width={cryptoBounds.w} height={cryptoBounds.h} rx="10"
                  fill={T.violetBg} fillOpacity="0.8"
                  stroke={T.violet} strokeOpacity="0.2" strokeWidth="1" strokeDasharray="5,4" />
                <text x={cryptoBounds.x + 10} y={cryptoBounds.y + 17}
                  fill={T.violet} opacity="0.45" fontSize="10.5" fontFamily={SANS}
                  letterSpacing="0.08em" fontWeight="600">CRYPTO</text>

                {/* ── Edges ────────────────────────────────────────── */}
                {EDGES.map((e, i) => {
                  const { path, mx, my } = edgePath(e.from, e.to, pos);
                  if (!path) return null;
                  return (
                    <g key={i} style={{ pointerEvents: "none" }}>
                      <path d={path} fill="none"
                        stroke={e.color} strokeWidth="1.8" strokeOpacity="0.45"
                        strokeDasharray={e.dash ? "5,4" : "none"}
                        markerEnd={`url(#${MARKER[e.color]})`} />
                      <rect x={mx - 40} y={my - 20} width="80" height="18"
                        rx="5" fill={T.surface} opacity="0.92" />
                      <text x={mx} y={my - 7} textAnchor="middle"
                        fill={e.color} fontSize="10.5" fontFamily={SANS}
                        fontWeight="600" opacity="0.9">
                        {e.label}
                      </text>
                    </g>
                  );
                })}

                {/* ── Nodes (draggable) ────────────────────────────── */}
                {Object.entries(pos).map(([id, { x, y }]) => {
                  const nd       = NODES[id];
                  if (!nd) return null;
                  const h        = nd.hero ? NHH : NH;
                  const isActive = sel === id;
                  return (
                    <g key={id} transform={`translate(${x},${y})`}
                      style={{ cursor: drag && dragRef.current?.id === id ? "grabbing" : "grab" }}
                      onMouseDown={(e) => onNodeMouseDown(e, id)}
                      onTouchStart={(e) => onNodeTouchStart(e, id)}
                      onClick={() => pick(id)}>

                      {isActive && (
                        <rect x="-4" y="-4" width={NW + 8} height={h + 8}
                          rx={NR + 3} fill="none"
                          stroke={nd.c} strokeWidth="2.5" opacity="0.35" />
                      )}
                      <rect width={NW} height={h} rx={NR}
                        fill={isActive ? nd.bg : T.surface}
                        stroke={isActive ? nd.c : T.border}
                        strokeWidth={isActive ? 1.8 : 1}
                        filter={nd.hero ? "url(#sh-hero)" : "url(#sh)"} />
                      <rect width={BAR} height={h} rx={NR}
                        fill={nd.c} opacity={isActive ? 1 : 0.65} />
                      <rect x={BAR} width={3} height={h} fill={nd.c} opacity="0.08" />

                      <text x={NW / 2 + BAR / 2} y={nd.hero ? h / 2 - 11 : h / 2 - 8}
                        textAnchor="middle" fill={isActive ? nd.c : T.ink}
                        fontSize={nd.hero ? 17 : 14} fontFamily={SERIF} fontWeight="700"
                        style={{ userSelect: "none" }}>
                        {nd.title}
                      </text>
                      <text x={NW / 2 + BAR / 2} y={nd.hero ? h / 2 + 9 : h / 2 + 12}
                        textAnchor="middle" fill={T.dim} fontSize="11" fontFamily={SANS}
                        style={{ userSelect: "none" }}>
                        {nd.sub}
                      </text>
                      {nd.hero && (
                        <text x={NW / 2 + BAR / 2} y={h / 2 + 26}
                          textAnchor="middle" fill={nd.c} fontSize="9"
                          fontFamily={SANS} fontWeight="600" letterSpacing="0.07em"
                          opacity="0.5" style={{ userSelect: "none" }}>
                          CENTRAL ENTITY
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Info panel */}
            <aside className="cbd-panel">
              {node ? (
                <div className="cbd-card" style={{ borderColor: node.c + "55" }}>
                  <div className="cbd-card-eyebrow">Selected</div>
                  <div className="cbd-card-title" style={{ color: node.c }}>{node.title}</div>
                  <div className="cbd-card-sub">{node.sub}</div>
                  <p className="cbd-card-desc">{node.desc}</p>
                </div>
              ) : (
                <div className="cbd-card cbd-card--hint">
                  Click any node to read about its role
                </div>
              )}
              <div className="cbd-drag-hint">Drag any node to rearrange</div>
              <div className="cbd-legend">
                <div className="cbd-legend-title">Legend</div>
                {[
                  [T.teal,   "SPV / Collateral"],
                  [T.indigo, "Oracle / Data / MNO / Agents"],
                  [T.amber,  "Fiat / Premium / Regulator"],
                  [T.violet, "Token / Crypto"],
                  [T.rose,   "Payout chain"],
                ].map(([c, l]) => (
                  <div key={l} className="cbd-legend-row">
                    <div className="cbd-legend-dot" style={{ background: c }} />
                    <span>{l}</span>
                  </div>
                ))}
                <div className="cbd-legend-row"
                  style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                  <div className="cbd-legend-dash" />
                  <span>Conditional / oversight flow</span>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            RAILS TAB
            ══════════════════════════════════════════════════════════════ */}
        {tab === "rails" && (
          <div className="cbd-rails">
            {[
              { label: "Fiat Rail", color: T.amber, bg: T.amberBg, items: [
                ["Settlement", "DTCC / Euroclear"], ["Min. investment", "$100,000 – $250,000"],
                ["Coupon", "Wire transfer (quarterly)"], ["Investor type", "Pension · DFI · Family office"],
                ["KYC / AML", "Traditional onboarding"], ["Secondary market", "OTC / Broker-dealer"],
                ["On trigger", "Indenture notice + wire"],
              ]},
              { label: "Token Rail", color: T.violet, bg: T.violetBg, items: [
                ["Standard", "ERC-3643 (T-REX)"], ["Min. investment", "$100 – $1,000"],
                ["Coupon", "USDC (smart contract)"], ["Investor type", "Crypto funds · Retail impact"],
                ["KYC / AML", "Embedded in token logic"], ["Secondary market", "Compliant ATS / DEX w/ KYC"],
                ["On trigger", "Oracle attestation → auto-route"],
              ]},
            ].map(rail => (
              <div key={rail.label} className="cbd-rail-card"
                style={{ background: rail.bg, borderColor: rail.color + "28" }}>
                <div className="cbd-rail-title" style={{ color: rail.color }}>{rail.label}</div>
                {rail.items.map(([k, v]) => (
                  <div key={k} className="cbd-rail-row">
                    <span className="cbd-rail-key">{k}</span>
                    <span className="cbd-rail-val">{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TRIGGER TAB
            ══════════════════════════════════════════════════════════════ */}
        {tab === "trigger" && (
          <div className="cbd-trigger">
            <p className="cbd-trigger-intro">Step-by-step sequence from event detection to disbursement</p>
            {[
              { n: "01", c: T.indigo, title: "Event detected", desc: "A qualifying peril occurs. Raw data published by USGS, NOAA, or an equivalent authoritative source." },
              { n: "02", c: T.indigo, title: "Oracle publishes on-chain", desc: "Chainlink ingests the data and writes it to the smart contract in tamper-proof form." },
              { n: "03", c: T.amber,  title: "Calculation agent certifies", desc: "A licensed third party signs the trigger attestation — binding for both the fiat indenture and the smart contract." },
              { n: "04", c: T.rose,   title: "Dual execution", desc: "Simultaneously: fiat wire to humanitarian wallet + stablecoin transfer from smart contract." },
              { n: "05", c: T.amber,  title: "Fiat investor loss absorbed", desc: "Paying agent reduces note value pro-rata per the indenture." },
              { n: "06", c: T.violet, title: "Token value reduced", desc: "Smart contract burns proportional token value. On-chain event emitted immediately." },
              { n: "07", c: T.rose,   title: "Disbursement to recipients", desc: "Humanitarian wallet → MNO → individual mobile wallets. MNO agents handle cash-out via the super-agent / bank infrastructure." },
            ].map(step => (
              <div key={step.n} className="cbd-step">
                <div className="cbd-step-n" style={{ color: step.c }}>{step.n}</div>
                <div>
                  <div className="cbd-step-title" style={{ color: step.c }}>{step.title}</div>
                  <div className="cbd-step-desc">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <footer className="cbd-footer">
          Conceptual structure only · Not investment or legal advice · ERC-3643 T-REX standard · Subject to jurisdictional securities law
        </footer>
      </div>
    </>
  );
}
