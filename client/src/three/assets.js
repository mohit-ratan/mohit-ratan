// CC0 low-poly models from Kenney (kenney.nl), served via the shorepine/kenney
// GitHub mirror over jsDelivr (open CORS, small files — verified: car ~170KB,
// furniture pieces 6-18KB each). Loaded at runtime via useGLTF, not bundled.
const KENNEY_BASE = 'https://cdn.jsdelivr.net/gh/shorepine/kenney@main/3d';

export const CAR_MODEL_URL = `${KENNEY_BASE}/car/sedan-sports.glb`;

export const FURNITURE_URLS = {
  plant: `${KENNEY_BASE}/furniture/pottedPlant.glb`,
  lamp: `${KENNEY_BASE}/furniture/lampRoundFloor.glb`,
  bookcase: `${KENNEY_BASE}/furniture/bookcaseOpen.glb`,
  table: `${KENNEY_BASE}/furniture/tableCoffee.glb`,
  rug: `${KENNEY_BASE}/furniture/rugRound.glb`,
  sofa: `${KENNEY_BASE}/furniture/loungeSofa.glb`,
  sideTable: `${KENNEY_BASE}/furniture/sideTable.glb`,
};

export const TREE_URLS = [
  `${KENNEY_BASE}/nature/tree_pineTallA.glb`,
  `${KENNEY_BASE}/nature/tree_pineTallB.glb`,
  `${KENNEY_BASE}/nature/tree_oak.glb`,
  `${KENNEY_BASE}/nature/tree_default.glb`,
  `${KENNEY_BASE}/nature/tree_fat.glb`,
];
