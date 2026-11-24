import * as THREE from 'three';

export const HERITAGE_HOTSPOTS = [
  {
    id: 'portico-1889',
    number: '1',
    label: 'Royal Foundation (1889)',
    tag: 'Nov 30, 1889',
    title: 'Foundation & Royal Vision (1889)',
    body:
      'Commissioned under Lalbagh superintendent John Cameron, the foundation stone of the Albert Victor Conservatory was laid on 30 November 1889 by Prince Albert Victor, grandson of Queen Victoria, during his royal visit to Bengaluru.',
    meta: ['Architect: John Cameron', 'Granite Plinth', 'Sunburst Portico'],
    worldPos: new THREE.Vector3(0, 7.65, 23.2),
    camPos: new THREE.Vector3(0, 4.4, 31.2),
    camTarget: new THREE.Vector3(0, 7.6, 20.5)
  },
  {
    id: 'saracen-iron',
    number: '2',
    label: 'Saracen Foundry Iron',
    tag: 'Glasgow, Scotland',
    title: 'Saracen Foundry Cast Iron',
    body:
      'Every fluted column, scroll spandrel, and curved lattice rib of the original structure was cast by Walter Macfarlane & Co. at the famous Saracen Foundry in Glasgow, shipped across the oceans, and bolted together on site as one of India’s earliest prefabricated iron halls.',
    meta: ['Walter Macfarlane & Co.', '3m Structural Bays', 'White Ferrovitreous Ribs'],
    worldPos: new THREE.Vector3(15, 7.2, 6),
    camPos: new THREE.Vector3(18.5, 4.6, 1.5),
    camTarget: new THREE.Vector3(12.5, 6.5, 6)
  },
  {
    id: 'crystal-cupola',
    number: '3',
    label: 'Crystal Palace Cupola',
    tag: '1890 Completion',
    title: 'Crystal Palace Barrel Vault & Cupola',
    body:
      'Explicitly modeled after Joseph Paxton’s 1851 Crystal Palace in London, four glazed barrel vaults converge on a soaring central crossing crowned by an octagonal lantern cupola, clerestory ribbons, and ridge monitors that vent warm tropical air naturally.',
    meta: ['Cruciform Plan', '23.2m Spire Peak', '2004 Structural Restoration'],
    worldPos: new THREE.Vector3(0, 17.5, 0),
    camPos: new THREE.Vector3(24, 15, 26),
    camTarget: new THREE.Vector3(0, 14.5, 0)
  },
  {
    id: 'flower-show',
    number: '4',
    label: 'Bi-Annual Flower Show',
    tag: 'Jan & Aug Tradition',
    title: 'Bi-Annual Lalbagh Flower Show',
    body:
      'Twice every year—for Republic Day (January) and Independence Day (August)—hundreds of thousands of fresh roses, marigolds, dahlias, and chrysanthemums transform the crossing into monumental floral tributes that draw visitors from across Karnataka.',
    meta: ['200,000+ Fresh Blooms', 'Floral Mandapa', 'Toggle Conservatory Mode'],
    worldPos: new THREE.Vector3(0, 5.5, 0),
    camPos: new THREE.Vector3(4.8, 3.3, 4.8),
    camTarget: new THREE.Vector3(0, 3.8, 0)
  },
  {
    id: 'wing-1935',
    number: '5',
    label: '1935 Rear Wing',
    tag: 'Mysore Iron Works',
    title: '1935 Mysore Iron Works Wing',
    body:
      'To accommodate Bengaluru’s growing horticultural exhibitions, the conservatory was expanded in 1935 using indigenous steel and iron components forged locally at the Mysore Iron and Steel Works in Bhadravathi.',
    meta: ['1935 Expansion', 'Bhadravathi Steel', 'North Transept'],
    worldPos: new THREE.Vector3(0, 7.5, -21),
    camPos: new THREE.Vector3(-11, 6.2, -31),
    camTarget: new THREE.Vector3(0, 7.2, -20)
  },
  {
    id: 'lalbagh-rock',
    number: '6',
    label: 'Lalbagh Rock & Tower',
    tag: '3-Billion-Year-Old Gneiss',
    title: '3-Billion-Year-Old Lalbagh Rock & Kempegowda Tower',
    body:
      'Rising behind the Glass House is a Geological Survey of India monument: an ancient Peninsular Gneiss outcrop estimated at 3 billion years old, crowned by one of the four 16th-century watchtowers built by Bengaluru’s founder Kempegowda.',
    meta: ['Peninsular Gneiss', 'Kempegowda Mantapa', 'National Geological Monument'],
    worldPos: new THREE.Vector3(-68, 22, -76),
    camPos: new THREE.Vector3(-34, 18, -36),
    camTarget: new THREE.Vector3(-68, 17, -76)
  }
];

export function createHotspotsController(layerEl, camera, onSelect) {
  let visible = true;
  let selectedId = null;

  const pinItems = HERITAGE_HOTSPOTS.map((hs) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hotspot-pin';
    btn.dataset.hotspotId = hs.id;
    const badge = document.createElement('span');
    badge.className = 'hotspot-badge';
    badge.textContent = hs.number;
    const label = document.createElement('span');
    label.textContent = hs.label;
    btn.append(badge, label);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedId = hs.id;
      syncSelectedClass();
      onSelect?.(hs);
    });
    layerEl.appendChild(btn);
    return { hs, btn };
  });

  function syncSelectedClass() {
    for (const item of pinItems) {
      item.btn.classList.toggle('selected', item.hs.id === selectedId);
    }
  }

  function setVisible(nextVisible) {
    visible = nextVisible;
    layerEl.classList.toggle('hidden', !visible);
  }

  function clearSelection() {
    selectedId = null;
    syncSelectedClass();
  }

  function selectById(id) {
    const found = HERITAGE_HOTSPOTS.find((h) => h.id === id);
    if (!found) return null;
    selectedId = found.id;
    syncSelectedClass();
    onSelect?.(found);
    return found;
  }

  const projected = new THREE.Vector3();

  function update(viewportWidth, viewportHeight) {
    if (!visible) return;
    for (const { hs, btn } of pinItems) {
      projected.copy(hs.worldPos).project(camera);
      // Hide if behind camera or out of clip bounds
      if (projected.z > 1 || projected.z < -1 || Math.abs(projected.x) > 1.05 || Math.abs(projected.y) > 1.05) {
        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';
        continue;
      }
      const x = (projected.x * 0.5 + 0.5) * viewportWidth;
      const y = (-projected.y * 0.5 + 0.5) * viewportHeight;
      btn.style.left = `${x.toFixed(1)}px`;
      btn.style.top = `${y.toFixed(1)}px`;
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  }

  return {
    setVisible,
    isVisible: () => visible,
    clearSelection,
    selectById,
    update
  };
}
