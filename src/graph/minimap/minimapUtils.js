// --- constants ---
const WIDTH = 200;
const HEIGHT = 140;
const PAD = 10; // padding inside minimap
const NODE_R = 3; // minimap node radius
const EDGE_OPACITY = 0.35; // dimmer edges

//---------------------------------------------------------------
// Compute graph bounding box from real node positions
//---------------------------------------------------------------
export function getGraphBounds(cy) {
  const nodes = cy.nodes();
  if (!nodes.length) return null;

  const positions = nodes
    .map((n) => n.position())
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

  if (!positions.length) return null;

  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    width: Math.max(Math.max(...xs) - Math.min(...xs), 1),
    height: Math.max(Math.max(...ys) - Math.min(...ys), 1),
    positions,
  };
}

//---------------------------------------------------------------
// Convert real graph coords → minimap coords
//---------------------------------------------------------------
export function toMini(x, y, bounds) {
  const innerW = WIDTH - PAD * 2;
  const innerH = HEIGHT - PAD * 2;
  const nx = ((x - bounds.minX) / bounds.width) * innerW + PAD;
  const ny = ((y - bounds.minY) / bounds.height) * innerH + PAD;
  return { x: nx, y: ny };
}

//---------------------------------------------------------------
// Draw FULL minimap: nodes, edges, viewport
//---------------------------------------------------------------
export function drawMinimap(cy, canvas) {
  if (!cy || !canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  const bounds = getGraphBounds(cy);
  if (!bounds) return;

  //-----------------------------------------------------------
  // 1. Draw edges
  //-----------------------------------------------------------
  const innerW = WIDTH - PAD * 2;
  const innerH = HEIGHT - PAD * 2;

  ctx.strokeStyle = `rgba(255,255,255,${EDGE_OPACITY})`;
  ctx.lineWidth = 1;

  cy.edges().forEach((e) => {
    const src = e.source().position();
    const tgt = e.target().position();
    const p1 = toMini(src.x, src.y, bounds);
    const p2 = toMini(tgt.x, tgt.y, bounds);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  });

  //-----------------------------------------------------------
  // 2. Draw nodes (in their actual color)
  //-----------------------------------------------------------
  cy.nodes().forEach((n) => {
    const p = n.position();
    const { x, y } = toMini(p.x, p.y, bounds);

    ctx.fillStyle = n.data('color') || '#6ea8fe';
    ctx.beginPath();
    ctx.arc(x, y, NODE_R, 0, Math.PI * 2);
    ctx.fill();
  });

  //-----------------------------------------------------------
  // 3. Draw viewport rectangle
  //-----------------------------------------------------------
  const pan = cy.pan();
  const zoom = cy.zoom();

  const graphX0 = 0 - pan.x / zoom;
  const graphY0 = 0 - pan.y / zoom;
  const graphX1 = cy.container().clientWidth / zoom - pan.x / zoom;
  const graphY1 = cy.container().clientHeight / zoom - pan.y / zoom;

  const tl = toMini(graphX0, graphY0, bounds);
  const br = toMini(graphX1, graphY1, bounds);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
}

//---------------------------------------------------------------
// Convert minimap click → graph pan so user can navigate
//---------------------------------------------------------------
export function handleMinimapClick(cy, canvas, evt) {
  const bounds = getGraphBounds(cy);
  if (!bounds) return;

  const rect = canvas.getBoundingClientRect();
  const mx = evt.clientX - rect.left;
  const my = evt.clientY - rect.top;

  // convert minimap -> graph coordinates
  const innerW = WIDTH - PAD * 2;
  const innerH = HEIGHT - PAD * 2;

  const gx = ((mx - PAD) / innerW) * bounds.width + bounds.minX;
  const gy = ((my - PAD) / innerH) * bounds.height + bounds.minY;

  // center graph on clicked point
  cy.center();
  cy.zoom(cy.zoom()); // keep zoom same

  const zoom = cy.zoom();
  cy.pan({
    x: canvas.width / 2 - gx * zoom,
    y: canvas.height / 2 - gy * zoom,
  });
}
