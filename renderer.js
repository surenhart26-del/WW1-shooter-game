// A dependency-free raycaster. All textures, sprites and weapons are drawn locally.
const FOV = Math.PI / 3;
const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

function surface(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return [canvas, canvas.getContext('2d')];
}

function polygon(ctx, color, points) {
  ctx.fillStyle = color; ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath(); ctx.fill();
}

function random(seed) {
  let n = seed;
  return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; };
}

function wallTexture(color) {
  const [canvas, ctx] = surface(128, 128);
  const rand = random(919);
  ctx.fillStyle = color || '#70684e'; ctx.fillRect(0, 0, 128, 128);
  for (let row = 0; row < 8; row++) {
    for (let col = -1; col < 4; col++) {
      const x = col * 48 + (row % 2 ? 24 : 0);
      ctx.fillStyle = `rgba(0,0,0,${.14 + rand() * .13})`;
      ctx.fillRect(x, row * 16, 48, 2);
      ctx.fillRect(x, row * 16, 2, 16);
      ctx.fillStyle = 'rgba(237,219,163,.13)'; ctx.fillRect(x + 2, row * 16 + 2, 44, 2);
      ctx.fillStyle = `rgba(0,0,0,${rand() * .14})`; ctx.fillRect(x + 2, row * 16 + 4, 44, 11);
    }
  }
  for (let i = 0; i < 1900; i++) {
    ctx.fillStyle = rand() > .5 ? 'rgba(0,0,0,.12)' : 'rgba(255,241,199,.1)';
    ctx.fillRect(rand() * 128, rand() * 128, 1, 1);
  }
  return canvas;
}

function soldierSprite() {
  const [canvas, ctx] = surface(80, 144);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(40, 137, 26, 5, 0, 0, TAU); ctx.fill();
  polygon(ctx, '#262d28', [[26, 91], [40, 94], [38, 127], [24, 131]]);
  polygon(ctx, '#384239', [[43, 92], [56, 89], [57, 129], [43, 130]]);
  ctx.fillStyle = '#171d19'; ctx.fillRect(20, 125, 19, 11); ctx.fillRect(43, 125, 19, 11);
  polygon(ctx, '#59604d', [[25, 43], [53, 43], [62, 93], [19, 93]]);
  polygon(ctx, '#6b725b', [[26, 45], [36, 48], [36, 87], [22, 87]]);
  polygon(ctx, '#323b31', [[40, 45], [53, 46], [62, 94], [41, 94]]);
  polygon(ctx, '#4b5341', [[24, 45], [15, 51], [10, 78], [21, 83], [29, 59]]);
  polygon(ctx, '#424c3e', [[51, 46], [63, 53], [68, 78], [59, 83], [48, 61]]);
  ctx.fillStyle = '#a08d69'; ctx.fillRect(14, 73, 9, 9); ctx.fillRect(57, 74, 9, 9);
  ctx.fillStyle = '#282b22'; ctx.fillRect(22, 80, 35, 6);
  ctx.fillStyle = '#796b4a'; ctx.fillRect(27, 79, 10, 10); ctx.fillRect(44, 79, 10, 10);
  ctx.fillStyle = '#c0a37b'; ctx.fillRect(31, 22, 20, 24);
  ctx.fillStyle = '#917d5d'; ctx.fillRect(44, 23, 7, 23);
  ctx.fillStyle = '#1c2723'; ctx.fillRect(32, 31, 6, 3); ctx.fillRect(44, 31, 5, 3);
  ctx.fillStyle = '#3d493d'; ctx.beginPath(); ctx.ellipse(40, 23, 19, 14, 0, Math.PI, TAU); ctx.fill();
  ctx.fillRect(21, 22, 39, 6); ctx.fillRect(25, 27, 8, 6); ctx.fillRect(49, 27, 7, 6);
  ctx.strokeStyle = '#7a8162'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(40, 24, 15, 3.5, 5.7); ctx.stroke();
  polygon(ctx, '#4b3628', [[15, 68], [57, 60], [60, 66], [18, 76]]);
  ctx.strokeStyle = '#1c2522'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(54, 63); ctx.lineTo(77, 58); ctx.stroke();
  ctx.fillStyle = '#b39b71'; ctx.fillRect(23, 67, 8, 7); ctx.fillRect(55, 62, 8, 7);
  return canvas;
}

function iconSprite(type) {
  const [canvas, ctx] = surface(64, 96);
  if (type === 'objective' || type === 'exit') {
    const gold = type === 'objective' ? '#e4bf72' : '#94c5a1';
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(32, 91, 25, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5b5845'; ctx.fillRect(29, 19, 4, 72);
    polygon(ctx, gold, [[33, 19], [59, 26], [50, 37], [33, 34]]);
    ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(31, 9, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(31, 9, 9, 0, TAU); ctx.stroke();
  } else if (type === 'grenade') {
    ctx.fillStyle = '#69704a'; ctx.beginPath(); ctx.ellipse(32, 77, 13, 17, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#333c2c'; ctx.lineWidth = 3;
    for (let y = 66; y < 90; y += 7) { ctx.beginPath(); ctx.moveTo(22, y); ctx.lineTo(42, y); ctx.stroke(); }
    ctx.fillStyle = '#9c9d7b'; ctx.fillRect(28, 57, 8, 6);
  } else {
    ctx.fillStyle = '#302d22'; ctx.fillRect(7, 57, 50, 35);
    ctx.fillStyle = type === 'health' ? '#e3d6ad' : '#7d7955'; ctx.fillRect(7, 54, 50, 32);
    ctx.strokeStyle = '#373e2e'; ctx.lineWidth = 3; ctx.strokeRect(9, 56, 46, 28);
    if (type === 'health') {
      ctx.fillStyle = '#a94737'; ctx.fillRect(27, 60, 10, 20); ctx.fillRect(22, 65, 20, 10);
    } else if (type === 'ammo') {
      ctx.fillStyle = '#d2bc77';
      for (let i = 0; i < 4; i++) { ctx.fillRect(19 + i * 8, 65, 5, 13); polygon(ctx, '#d2bc77', [[19 + i * 8, 65], [21 + i * 8, 60], [24 + i * 8, 65]]); }
    } else {
      ctx.fillStyle = '#c8c18c'; ctx.beginPath(); ctx.ellipse(32, 70, 9, 11, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#363e2d'; ctx.beginPath(); ctx.moveTo(23, 70); ctx.lineTo(41, 70); ctx.moveTo(32, 60); ctx.lineTo(32, 80); ctx.stroke();
    }
  }
  return canvas;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    if (!canvas.width || canvas.width === 300) { canvas.width = 960; canvas.height = 540; }
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.wallColor = null; this.wall = null;
    this.soldier = soldierSprite();
    this.icons = Object.fromEntries(['health', 'ammo', 'grenades', 'grenade', 'objective', 'exit'].map(type => [type, iconSprite(type)]));
    this.depth = new Float32Array(canvas.width);
  }

  sky(time, palette, angle = 0) {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height, horizon = h * .49;
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, palette.sky || '#68746d'); sky.addColorStop(1, palette.fog || '#b2b09a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, horizon + 1);
    ctx.fillStyle = 'rgba(239,216,161,.23)'; ctx.beginPath(); ctx.arc(w * .73, h * .17, h * .068, 0, TAU); ctx.fill();
    const offset = (angle * w / TAU) % w;
    for (let layer = 0; layer < 3; layer++) {
      const rand = random(22 + layer * 8);
      ctx.fillStyle = ['#667066', '#596259', '#475448'][layer];
      ctx.globalAlpha = .18 + layer * .1; ctx.beginPath(); ctx.moveTo(-w, horizon);
      for (let x = -w; x <= w * 2; x += 35) ctx.lineTo(x - offset, horizon - 12 - rand() * (15 + layer * 9));
      ctx.lineTo(w * 2, horizon); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const ground = ctx.createLinearGradient(0, horizon, 0, h);
    ground.addColorStop(0, palette.fog || '#a09e88'); ground.addColorStop(.18, palette.ground || '#545442'); ground.addColorStop(1, '#252c24');
    ctx.fillStyle = ground; ctx.fillRect(0, horizon, w, h - horizon);
    ctx.fillStyle = 'rgba(12,18,15,.12)';
    for (let y = horizon + 8; y < h; y += Math.max(3, (y - horizon) * .12)) ctx.fillRect(0, y, w, 1);
  }

  render(game, time = 0) {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    const { mission, player } = game;
    const palette = mission.palette || {};
    this.sky(time, palette, player.angle);
    if (this.wallColor !== palette.wall) { this.wallColor = palette.wall; this.wall = wallTexture(palette.wall); }
    const focal = w / (2 * Math.tan(FOV / 2));
    const horizon = h * .49;
    const map = mission.map;
    const isWall = (x, y) => !map[y] || map[y][x] === undefined || map[y][x] === '#';
    for (let screenX = 0; screenX < w; screenX += 2) {
      const cameraX = (screenX - w / 2) / focal;
      const dirX = Math.cos(player.angle) - Math.sin(player.angle) * cameraX;
      const dirY = Math.sin(player.angle) + Math.cos(player.angle) * cameraX;
      let mx = Math.floor(player.x), my = Math.floor(player.y);
      const deltaX = Math.abs(1 / dirX), deltaY = Math.abs(1 / dirY);
      const stepX = dirX < 0 ? -1 : 1, stepY = dirY < 0 ? -1 : 1;
      let sideX = (dirX < 0 ? player.x - mx : mx + 1 - player.x) * deltaX;
      let sideY = (dirY < 0 ? player.y - my : my + 1 - player.y) * deltaY;
      let side = 0;
      for (let step = 0; step < 100; step++) {
        if (sideX < sideY) { sideX += deltaX; mx += stepX; side = 0; }
        else { sideY += deltaY; my += stepY; side = 1; }
        if (isWall(mx, my)) break;
      }
      const distance = Math.max(.04, side ? sideY - deltaY : sideX - deltaX);
      const wallHeight = Math.min(h * 20, focal / distance);
      const top = horizon - wallHeight * .53;
      const hit = side ? player.x + distance * dirX : player.y + distance * dirY;
      const texX = Math.floor((hit - Math.floor(hit)) * 128);
      ctx.drawImage(this.wall, texX, 0, 1, 128, screenX, top, 2, wallHeight);
      ctx.fillStyle = `rgba(6,13,10,${clamp(distance * .027 + (side ? .16 : .02), 0, .74)})`;
      ctx.fillRect(screenX, top, 2, wallHeight);
      ctx.fillStyle = palette.fog || '#9b9b81'; ctx.globalAlpha = clamp((distance - 3) * .027, 0, .6);
      ctx.fillRect(screenX, top, 2, wallHeight); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(222,208,155,.2)'; ctx.fillRect(screenX, top, 2, Math.max(1, wallHeight * .012));
      this.depth[screenX] = distance; if (screenX + 1 < w) this.depth[screenX + 1] = distance;
    }
    const sprites = [];
    for (const enemy of game.enemies) if (enemy.hp > 0) sprites.push({ ...enemy, image: this.soldier, height: .86, flash: enemy.flash });
    for (const supply of game.supplies) if (!supply.used) sprites.push({ ...supply, image: this.icons[supply.type], height: .6 });
    for (const grenade of game.grenades) sprites.push({ ...grenade, image: this.icons.grenade, height: .24 });
    if (!game.objectiveDone) sprites.push({ ...mission.objective, image: this.icons.objective, height: .95 });
    else sprites.push({ ...mission.exit, image: this.icons.exit, height: .95 });
    sprites.sort((a, b) => Math.hypot(b.x - player.x, b.y - player.y) - Math.hypot(a.x - player.x, a.y - player.y));
    for (const sprite of sprites) {
      if (!sprite.image) continue;
      const dx = sprite.x - player.x, dy = sprite.y - player.y;
      const distance = dx * Math.cos(player.angle) + dy * Math.sin(player.angle);
      if (distance < .12) continue;
      const lateral = -dx * Math.sin(player.angle) + dy * Math.cos(player.angle);
      const size = focal * sprite.height / distance;
      const sw = size * sprite.image.width / sprite.image.height;
      const left = w / 2 + lateral / distance * focal - sw / 2;
      const top = horizon + focal * .47 / distance - size;
      if (left > w || left + sw < 0) continue;
      ctx.globalAlpha = clamp(1 - distance * .015, .5, 1);
      for (let x = Math.max(0, Math.floor(left)); x < Math.min(w, left + sw); x += 2) {
        if (distance < this.depth[x]) {
          const sx = clamp(Math.floor((x - left) / sw * sprite.image.width), 0, sprite.image.width - 1);
          ctx.drawImage(sprite.image, sx, 0, 1, sprite.image.height, x, top, 2, size);
        }
      }
      ctx.globalAlpha = 1;
      if (sprite.flash > 0 && distance < this.depth[clamp(Math.floor(left + sw / 2), 0, w - 1)]) {
        ctx.fillStyle = '#ffdda0'; ctx.beginPath(); ctx.arc(left + sw * .9, top + size * .42, Math.max(3, size * .065), 0, TAU); ctx.fill();
      }
    }
    for (const blast of game.explosions) {
      const dx = blast.x - player.x, dy = blast.y - player.y;
      const distance = dx * Math.cos(player.angle) + dy * Math.sin(player.angle);
      if (distance < .1) continue;
      const lateral = -dx * Math.sin(player.angle) + dy * Math.cos(player.angle);
      const x = w / 2 + lateral / distance * focal;
      if (x < 0 || x >= w || distance > this.depth[Math.floor(x)] + .2) continue;
      const radius = focal / distance * .65;
      const glow = ctx.createRadialGradient(x, horizon, 0, x, horizon, radius);
      glow.addColorStop(0, '#fff2b3'); glow.addColorStop(.3, '#eda35b'); glow.addColorStop(1, 'rgba(108,77,43,0)');
      ctx.globalAlpha = clamp(blast.life * 2, 0, 1); ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, horizon, radius, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
    this.weapon(game, time);
    const vignette = ctx.createRadialGradient(w / 2, h / 2, h * .25, w / 2, h / 2, w * .67);
    vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(5,10,8,.6)');
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, w, h);
    if (game.hurtFlash > 0) { ctx.fillStyle = `rgba(140,30,20,${Math.min(.38, game.hurtFlash * .8)})`; ctx.fillRect(0, 0, w, h); }
    this.minimap(game);
  }

  weapon(game, time) {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    const scale = h / 540;
    const bob = game.moving ? Math.sin(time * 10) * 4 : Math.sin(time * 1.5) * 1.2;
    const recoil = Math.min(1, (game.shotFlash || 0) * 8);
    const reload = game.reloadTime > 0 ? 65 + Math.sin(time * 7) * 9 : 0;
    ctx.save(); ctx.translate(w * .55, h + (bob + recoil * 17 + reload) * scale); ctx.scale(scale, scale);
    ctx.rotate(game.reloadTime > 0 ? -.13 : 0);
    if (game.weapon === 'pistol') {
      polygon(ctx, '#414b38', [[-45, 0], [-15, -72], [53, -66], [90, 0]]);
      polygon(ctx, '#b39469', [[-12, -57], [-20, -114], [24, -129], [54, -67], [41, -25]]);
      polygon(ctx, '#382a21', [[-13, -125], [30, -137], [43, -63], [8, -54]]);
      for (let i = 0; i < 8; i++) { ctx.strokeStyle = '#70523b'; ctx.beginPath(); ctx.moveTo(1, -116 + i * 7); ctx.lineTo(31, -123 + i * 7); ctx.stroke(); }
      polygon(ctx, '#252c29', [[-23, -181], [15, -190], [37, -117], [-10, -108]]);
      polygon(ctx, '#626b62', [[-23, -181], [15, -190], [17, -174], [-20, -165]]);
      polygon(ctx, '#434c45', [[-18, -171], [14, -178], [29, -126], [-7, -118]]);
      ctx.fillStyle = '#121b18'; ctx.fillRect(-8, -195, 13, 10);
      for (let i = 0; i < 5; i++) { ctx.strokeStyle = '#8a9181'; ctx.beginPath(); ctx.moveTo(-9 + i * 6, -131); ctx.lineTo(-12 + i * 6, -143); ctx.stroke(); }
      ctx.strokeStyle = '#1a2420'; ctx.lineWidth = 5; ctx.strokeRect(23, -115, 18, 24);
      if (recoil > 0) this.muzzle(ctx, -4, -194, recoil);
    } else if (game.weapon === 'grenade') {
      polygon(ctx, '#46503b', [[-63, 0], [-35, -80], [38, -84], [74, 0]]);
      polygon(ctx, '#b69a71', [[-30, -48], [-45, -114], [-28, -148], [26, -148], [44, -101], [33, -50]]);
      ctx.fillStyle = '#596145'; ctx.beginPath(); ctx.ellipse(-2, -145, 34, 48, -.12, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2a352a'; ctx.lineWidth = 4;
      for (let y = -178; y < -109; y += 15) { ctx.beginPath(); ctx.moveTo(-29, y); ctx.lineTo(27, y); ctx.stroke(); }
      for (let x = -18; x <= 18; x += 18) { ctx.beginPath(); ctx.moveTo(x, -188); ctx.lineTo(x + 3, -101); ctx.stroke(); }
      ctx.fillStyle = '#9ca18a'; ctx.fillRect(-12, -197, 18, 15);
      ctx.strokeStyle = '#a4a58a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-6, -194); ctx.lineTo(26, -187); ctx.lineTo(34, -140); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-17, -198, 11, 0, TAU); ctx.stroke();
    } else {
      polygon(ctx, '#414a36', [[49, 0], [75, -90], [128, -73], [174, 0]]);
      polygon(ctx, '#a48a63', [[69, -72], [55, -113], [76, -135], [111, -108], [120, -58]]);
      polygon(ctx, '#3b2b20', [[-15, -32], [13, -64], [107, 0], [41, 0]]);
      polygon(ctx, '#6e4b30', [[-47, -179], [-22, -189], [77, -45], [25, -17]]);
      polygon(ctx, '#986b41', [[-46, -176], [-39, -181], [40, -51], [26, -42]]);
      polygon(ctx, '#323b35', [[-50, -206], [-34, -210], [37, -80], [14, -70]]);
      polygon(ctx, '#6b7469', [[-43, -207], [-36, -209], [29, -83], [23, -83]]);
      polygon(ctx, '#242d28', [[-27, -142], [-5, -148], [32, -85], [13, -73]]);
      ctx.strokeStyle = '#9b9d83'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-15, -143); ctx.lineTo(14, -102); ctx.stroke();
      ctx.strokeStyle = '#30392f'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(17, -102); ctx.lineTo(42, -119); ctx.stroke();
      ctx.fillStyle = '#6c7565'; ctx.beginPath(); ctx.arc(44, -121, 8, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#19231d'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-49, -205); ctx.lineTo(-51, -222); ctx.lineTo(-40, -225); ctx.lineTo(-37, -210); ctx.stroke();
      ctx.strokeStyle = '#4c3527'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-42, -165); ctx.quadraticCurveTo(-24, -36, 44, -12); ctx.stroke();
      if (recoil > 0) this.muzzle(ctx, -46, -218, recoil);
    }
    ctx.restore();
  }

  muzzle(ctx, x, y, amount) {
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = clamp(amount, 0, 1);
    polygon(ctx, '#f8ad54', [[0, -58], [10, -15], [36, -26], [16, 0], [31, 15], [5, 12], [-13, 31], [-14, 6], [-40, -1], [-13, -13], [-25, -38]]);
    polygon(ctx, '#fff1bc', [[0, -34], [7, -7], [21, 0], [3, 7], [-8, 15], [-9, -5], [-22, -13], [-5, -13]]);
    ctx.restore();
  }

  minimap(game) {
    const ctx = this.ctx, w = this.canvas.width;
    const map = game.mission.map, size = 4.5, pad = 12;
    const width = map[0].length * size, height = map.length * size;
    const left = w - width - 24, top = 78;
    ctx.fillStyle = 'rgba(14,24,19,.82)'; ctx.fillRect(left - pad, top - pad, width + pad * 2, height + pad * 2);
    ctx.strokeStyle = 'rgba(217,199,150,.35)'; ctx.lineWidth = 1; ctx.strokeRect(left - pad, top - pad, width + pad * 2, height + pad * 2);
    for (let y = 0; y < map.length; y++) for (let x = 0; x < map[y].length; x++) {
      ctx.fillStyle = map[y][x] === '#' ? '#71725a' : '#2c392d';
      ctx.fillRect(left + x * size, top + y * size, size - .5, size - .5);
    }
    const target = game.objectiveDone ? game.mission.exit : game.mission.objective;
    ctx.fillStyle = game.objectiveDone ? '#a7d7ad' : '#e0ba72';
    ctx.fillRect(left + target.x * size - 2, top + target.y * size - 2, 4, 4);
    for (const enemy of game.enemies) if (enemy.hp > 0 && Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y) < 5) {
      ctx.fillStyle = '#c47763'; ctx.fillRect(left + enemy.x * size - 1, top + enemy.y * size - 1, 2, 2);
    }
    ctx.save(); ctx.translate(left + game.player.x * size, top + game.player.y * size); ctx.rotate(game.player.angle);
    polygon(ctx, '#f1ead3', [[4, 0], [-3, -2.5], [-1.5, 0], [-3, 2.5]]); ctx.restore();
  }

  renderBackdrop(time = 0) {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    this.sky(time, { sky: '#34463c', ground: '#45503a', fog: '#a3a48a' }, 0);
    const rand = random(92);
    for (let i = 0; i < 27; i++) {
      const x = rand() * w, y = h * (.44 + rand() * .08), height = 15 + rand() * 65;
      ctx.strokeStyle = i % 2 ? '#455244' : '#5d6652'; ctx.lineWidth = 2 + rand() * 3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y - height);
      ctx.moveTo(x - 2, y - height * .5); ctx.lineTo(x - 16, y - height * .72);
      ctx.moveTo(x - 3, y - height * .68); ctx.lineTo(x + 11, y - height * .87); ctx.stroke();
    }
    polygon(ctx, '#333c2e', [[0, h * .54], [w * .39, h * .55], [w * .43, h * .71], [w * .2, h], [0, h]]);
    polygon(ctx, '#454936', [[w, h * .5], [w * .64, h * .54], [w * .57, h * .72], [w * .86, h], [w, h]]);
    polygon(ctx, '#272f25', [[w * .39, h * .55], [w * .64, h * .54], [w * .57, h * .72], [w * .86, h], [w * .2, h], [w * .43, h * .71]]);
    for (let i = 0; i < 15; i++) {
      const t = i / 15, y = h * (.57 + t * t * .43);
      const left = w * (.43 - t * .23), right = w * (.57 + t * .29);
      ctx.strokeStyle = '#655f43'; ctx.lineWidth = 2 + t * 9;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y + 2); ctx.stroke();
    }
    for (let side = 0; side < 2; side++) {
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 8; col++) {
          const x = side === 0 ? col * w * .061 - row * w * .02 : w * .66 + col * w * .06 + row * w * .015;
          const y = h * .52 + row * h * .041 + col * h * (side ? .011 : -.005);
          ctx.fillStyle = ['#575942', '#606149', '#4d533e'][(row + col) % 3];
          ctx.beginPath(); ctx.roundRect(x, y, w * .063, h * .047, 8); ctx.fill();
          ctx.strokeStyle = 'rgba(28,35,24,.4)'; ctx.lineWidth = 2; ctx.stroke();
        }
      }
    }
    ctx.strokeStyle = '#27382c'; ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const x = i * w / 8;
      ctx.beginPath(); ctx.moveTo(x, h * .53); ctx.lineTo(x + 7, h * .4); ctx.stroke();
    }
    for (let line = 0; line < 2; line++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) { const y = h * (.43 + line * .035) + Math.sin(x / 27) * 7; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      for (let x = 15; x < w; x += 39) {
        const y = h * (.43 + line * .035) + Math.sin(x / 27) * 7;
        ctx.beginPath(); ctx.moveTo(x - 4, y - 5); ctx.lineTo(x + 4, y + 5); ctx.moveTo(x - 4, y + 5); ctx.lineTo(x + 4, y - 5); ctx.stroke();
      }
    }
    const shade = ctx.createLinearGradient(0, 0, w, h); shade.addColorStop(0, 'rgba(13,25,19,.65)'); shade.addColorStop(.55, 'rgba(13,25,19,.1)'); shade.addColorStop(1, 'rgba(13,25,19,.6)');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(220,209,158,.16)';
    for (let i = 0; i < 32; i++) { const x = (rand() * w + time * (4 + i % 5)) % w, y = rand() * h; ctx.fillRect(x, y, 1.5, 1.5); }
  }
}
