/**
 * generate-snapshot.js
 * Generates a static SVG snapshot of the Cat Bond diagram (South view, default).
 * Run:  node generate-snapshot.js  → writes snapshot.svg
 */

import fs from "fs";

const T = {
  bg: "#EDE8DF", surface: "#FFFFFF", raised: "#F5F1EA",
  border: "#D9D3C8", borderHi: "#B8B0A2",
  ink: "#1C1917", mid: "#57534E", dim: "#9C958C",
  teal: "#0D9488", tealSoft: "#99F6E4", tealBg: "#F0FDFA",
  indigo: "#4338CA", indigoSoft: "#C7D2FE", indigoBg: "#EEF2FF",
  amber: "#B45309", amberSoft: "#FDE68A", amberBg: "#FFFBEB",
  violet: "#7C3AED", violetSoft: "#DDD6FE", violetBg: "#F5F3FF",
  rose: "#BE123C", roseSoft: "#FECDD3", roseBg: "#FFF1F2",
};

const NW = 154, NH = 58, NHH = 72, BAR = 5, NR = 10;
const W = 720, H = 880;
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS  = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif";

const NODES = {
  person:          { title: "Recipient",          sub: "Person living in the affected area", c: T.rose,   bg: T.roseBg   },
  mno_agent:       { title: "MNO Agent",           sub: "Mobile money cash-out",             c: T.rose,   bg: T.roseBg   },
  mno:             { title: "MNO",                 sub: "Mobile Network Operator",           c: T.indigo, bg: T.indigoBg },
  humanitarian:    { title: "Humanitarian Wallet", sub: "IFRC · WFP · Nat. Society",        c: T.rose,   bg: T.roseBg   },
  super_agent:     { title: "Super Agent",         sub: "Agent network manager",             c: T.indigo, bg: T.indigoBg },
  bank:            { title: "Commercial Bank",     sub: "Super agent settlement",            c: T.indigo, bg: T.indigoBg },
  fiat_investors:  { title: "Fiat Tranche",        sub: "ISIN/CUSIP · Min $100k",           c: T.amber,  bg: T.amberBg  },
  token_investors: { title: "Token Tranche",       sub: "ERC-3643 · Min $100",              c: T.violet, bg: T.violetBg },
  central_bank:    { title: "Central Bank",        sub: "Regulator · Oversight",            c: T.amber,  bg: T.amberBg  },
  sponsors:        { title: "Risk Sponsors",       sub: "IFRC · World Bank · ODA",          c: T.amber,  bg: T.amberBg  },
  spv:             { title: "SPV",                 sub: "Cayman · Bermuda",                 c: T.teal,   bg: T.tealBg,  hero: true },
  calcagent:       { title: "Calculation Agent",   sub: "Trigger certification",            c: T.indigo, bg: T.indigoBg },
  collateral:      { title: "Collateral Pool",     sub: "T-Bills · Tokenized MMF",         c: T.teal,   bg: T.tealBg   },
  oracle:          { title: "Parametric Oracle",   sub: "USGS · NOAA · Chainlink",         c: T.indigo, bg: T.indigoBg },
};

const POS = {
  person:          { x: 18,  y: 34  },
  mno_agent:       { x: 18,  y: 152 },
  mno:             { x: 190, y: 152 },
  humanitarian:    { x: 370, y: 152 },
  super_agent:     { x: 18,  y: 280 },
  bank:            { x: 190, y: 280 },
  fiat_investors:  { x: 370, y: 280 },
  token_investors: { x: 548, y: 280 },
  central_bank:    { x: 18,  y: 408 },
  sponsors:        { x: 370, y: 408 },
  spv:             { x: 283, y: 536 },
  calcagent:       { x: 548, y: 536 },
  collateral:      { x: 190, y: 690 },
  oracle:          { x: 450, y: 690 },
};

const EDGES = [
  { from: "sponsors",     to: "spv",            label: "Premium",           color: T.amber,  dash: false },
  { from: "spv",          to: "collateral",      label: "Principal",         color: T.teal,   dash: false },
  { from: "collateral",   to: "oracle",          label: "Monitoring",        color: T.indigo, dash: true  },
  { from: "oracle",       to: "calcagent",       label: "Data feed",         color: T.indigo, dash: false },
  { from: "calcagent",    to: "spv",             label: "Trigger confirmed", color: T.rose,   dash: false },
  { from: "spv",          to: "fiat_investors",  label: "Notes issued",      color: T.amber,  dash: false },
  { from: "spv",          to: "token_investors", label: "Tokens minted",     color: T.violet, dash: false },
  { from: "spv",          to: "humanitarian",    label: "Payout on trigger", color: T.rose,   dash: true  },
  { from: "humanitarian", to: "mno",             label: "Disbursement",      color: T.rose,   dash: false },
  { from: "mno",          to: "person",          label: "Mobile payout",     color: T.rose,   dash: false },
  { from: "person",       to: "mno_agent",       label: "Cash-out",          color: T.rose,   dash: false },
  { from: "mno",          to: "mno_agent",       label: "Agent network",     color: T.indigo, dash: true  },
  { from: "mno_agent",    to: "super_agent",     label: "E-float mgmt",      color: T.indigo, dash: false },
  { from: "super_agent",  to: "bank",            label: "Settlement",        color: T.indigo, dash: false },
  { from: "bank",         to: "central_bank",    label: "Oversight",         color: T.amber,  dash: true  },
];

function edgePath(fromId, toId) {
  const fp = POS[fromId], tp = POS[toId];
  const fh = NODES[fromId].hero ? NHH : NH;
  const th = NODES[toId].hero   ? NHH : NH;
  const fc = { x: fp.x + NW / 2, y: fp.y + fh / 2 };
  const tc = { x: tp.x + NW / 2, y: tp.y + th / 2 };
  const dx = tc.x - fc.x, dy = tc.y - fc.y;
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

function nodeBounds(ids, pad = 14) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of ids) {
    const p = POS[id], h = NODES[id].hero ? NHH : NH;
    minX = Math.min(minX, p.x);      minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + NW); maxY = Math.max(maxY, p.y + h);
  }
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}

const FIN  = nodeBounds(["sponsors","spv","calcagent","collateral","oracle","fiat_investors","token_investors"]);
const PAY  = nodeBounds(["person","mno_agent","mno","humanitarian","super_agent","bank","central_bank"]);

const MARKER_COLORS = [T.teal, T.indigo, T.amber, T.violet, T.rose];
const MARKER_ID = {
  [T.teal]:   "arr-teal",
  [T.indigo]: "arr-indigo",
  [T.amber]:  "arr-amber",
  [T.violet]: "arr-violet",
  [T.rose]:   "arr-rose",
};

const markers = MARKER_COLORS.map(c => `
  <marker id="${MARKER_ID[c]}" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
    <path d="M0,0.5 L0,6.5 L7,3.5 z" fill="${c}" opacity="0.82"/>
  </marker>`).join("");

const edges = EDGES.map(e => {
  const { path, mx, my } = edgePath(e.from, e.to);
  const lw = e.label.length * 4.4 + 10;
  return `
  <path d="${path}" fill="none" stroke="${e.color}" stroke-width="1.8" stroke-opacity="0.45"
    ${e.dash ? 'stroke-dasharray="5,4"' : ""} marker-end="url(#${MARKER_ID[e.color]})"/>
  <rect x="${mx - lw/2}" y="${my - 17}" width="${lw}" height="15" rx="4" fill="${T.surface}" opacity="0.9"/>
  <text x="${mx}" y="${my - 6.5}" text-anchor="middle" fill="${e.color}"
    font-size="8.5" font-family="${SANS}" font-weight="600" opacity="0.9">${e.label}</text>`;
}).join("");

const nodes = Object.entries(POS).map(([id, { x, y }]) => {
  const nd = NODES[id];
  const h  = nd.hero ? NHH : NH;
  const heroExtra = nd.hero ? `
    <rect x="${BAR}" y="0" width="${NW - BAR}" height="${h}" rx="${NR}" fill="${nd.c}" opacity="0.04"/>` : "";
  const heroLabel = nd.hero ? `
    <text x="${NW/2 + BAR/2}" y="${h/2 + 22}" text-anchor="middle" fill="${nd.c}"
      font-size="7.5" font-family="${SANS}" font-weight="600" letter-spacing="0.07em" opacity="0.5">CENTRAL ENTITY</text>` : "";
  const titleY = nd.hero ? h/2 - 9 : h/2 - 7;
  const subY   = nd.hero ? h/2 + 8 : h/2 + 10;
  return `
  <g transform="translate(${x},${y})">
    <filter id="sh-${id}">
      <feDropShadow dx="0" dy="${nd.hero ? 5 : 2}" stdDeviation="${nd.hero ? 8 : 3}"
        flood-color="${nd.hero ? nd.c + "30" : "#1C191714"}"/>
    </filter>
    <rect width="${NW}" height="${h}" rx="${NR}" fill="${T.surface}" stroke="${T.border}"
      stroke-width="1" filter="url(#sh-${id})"/>
    ${heroExtra}
    <rect width="${BAR}" height="${h}" rx="${NR}" fill="${nd.c}" opacity="0.65"/>
    <rect x="${BAR}" width="3" height="${h}" fill="${nd.c}" opacity="0.08"/>
    <text x="${NW/2 + BAR/2}" y="${titleY}" text-anchor="middle" fill="${T.ink}"
      font-size="${nd.hero ? 14 : 12}" font-family="${SERIF}" font-weight="700">${nd.title}</text>
    <text x="${NW/2 + BAR/2}" y="${subY}" text-anchor="middle" fill="${T.dim}"
      font-size="9" font-family="${SANS}">${nd.sub}</text>
    ${heroLabel}
  </g>`;
}).join("");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="canvas-bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#F5F0E8"/>
      <stop offset="100%" stop-color="#E5DDD0"/>
    </linearGradient>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.2" fill="${T.borderHi}" opacity="0.4"/>
    </pattern>
    ${markers}
  </defs>

  <!-- Canvas -->
  <rect width="${W}" height="${H}" fill="url(#canvas-bg)" rx="13"/>
  <rect width="${W}" height="${H}" fill="url(#dots)" rx="13"/>

  <!-- Financial structure zone -->
  <rect x="${FIN.x}" y="${FIN.y}" width="${FIN.w}" height="${FIN.h}" rx="12"
    fill="${T.tealBg}" fill-opacity="0.35" stroke="${T.teal}" stroke-opacity="0.12"
    stroke-width="1" stroke-dasharray="6,4"/>
  <text x="${FIN.x + 12}" y="${FIN.y + 18}" fill="${T.teal}" opacity="0.4"
    font-size="10" font-family="${SANS}" letter-spacing="0.08em" font-weight="600">FINANCIAL STRUCTURE</text>

  <!-- Payout chain zone -->
  <rect x="${PAY.x}" y="${PAY.y}" width="${PAY.w}" height="${PAY.h}" rx="12"
    fill="${T.roseBg}" fill-opacity="0.5" stroke="${T.rose}" stroke-opacity="0.15"
    stroke-width="1" stroke-dasharray="6,4"/>
  <text x="${PAY.x + 12}" y="${PAY.y + 18}" fill="${T.rose}" opacity="0.38"
    font-size="10" font-family="${SANS}" letter-spacing="0.08em" font-weight="600">PAYOUT CHAIN</text>

  <!-- Edges -->
  ${edges}

  <!-- Nodes -->
  ${nodes}

  <!-- Title bar -->
  <rect x="0" y="${H - 34}" width="${W}" height="34" fill="${T.surface}" opacity="0.85" rx="13"/>
  <text x="16" y="${H - 13}" fill="${T.teal}" font-size="11" font-family="${SERIF}"
    font-weight="700">Dual-Rail Humanitarian Cat Bond — Global South View</text>
  <text x="${W - 12}" y="${H - 13}" text-anchor="end" fill="${T.dim}" font-size="9"
    font-family="${SANS}">Conceptual only · not investment advice</text>
</svg>`;

fs.writeFileSync("snapshot.svg", svg);
console.log("snapshot.svg written (" + svg.length + " bytes)");
