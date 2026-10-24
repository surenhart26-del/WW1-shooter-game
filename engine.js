export const WEAPONS = {
  rifle: { name: 'Lee-Enfield', capacity: 10, reserve: 60, damage: 100, cooldown: 0.85, reload: 2.4, range: 22 },
  pistol: { name: 'M1911', capacity: 7, reserve: 49, damage: 40, cooldown: 0.24, reload: 1.5, range: 13 },
  grenade: { name: 'Handgranaat', capacity: 3 },
};
export const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function solid(map, x, y) {
  return map[Math.floor(y)]?.[Math.floor(x)] !== '.';
}
export function clearLine(map, a, b) {
  const d = distance(a, b), steps = Math.ceil(d / 0.08);
  for (let i = 1; i <= steps; i++) {
    if (solid(map, a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps)) return false;
  }
  return true;
}

export class Game {
  constructor(mission, onEvent = () => {}) {
    this.mission = mission;
    this.onEvent = onEvent;
    this.player = { ...mission.spawn, hp: 100 };
    this.enemies = mission.enemies.map((e, i) => ({ ...e, hp: e.hp || 100, cooldown: 1.8 + i * 0.3, flash: 0 }));
    this.supplies = mission.supplies.map(s => ({ ...s, used: false }));
    this.ammo = { rifle: 10, pistol: 7 };
    this.reserve = { rifle: 60, pistol: 49 };
    this.grenadeCount = 3;
    this.weapon = 'rifle';
    this.grenades = [];
    this.explosions = [];
    this.cooldown = 0;
    this.reloadTime = 0;
    this.shotFlash = 0;
    this.hurtFlash = 0;
    this.kills = 0;
    this.shots = 0;
    this.hits = 0;
    this.elapsed = 0;
    this.objectiveDone = false;
    this.status = 'playing';
    this.moving = false;
    this.pathClock = 0;
    this.flow = new Map();
  }
  emit(type, detail = {}) { this.onEvent({ type, ...detail }); }
  move(entity, dx, dy, radius = 0.2) {
    const free = (x, y) => [-radius, radius].every(ox => [-radius, radius].every(oy => !solid(this.mission.map, x + ox, y + oy)));
    if (free(entity.x + dx, entity.y)) entity.x += dx;
    if (free(entity.x, entity.y + dy)) entity.y += dy;
  }
  select(weapon) {
    if (!WEAPONS[weapon] || this.status !== 'playing') return;
    this.weapon = weapon;
    this.reloadTime = 0;
    this.emit('switch');
  }
  reload() {
    const w = WEAPONS[this.weapon];
    if (this.status !== 'playing' || this.weapon === 'grenade' || this.reloadTime > 0 || this.ammo[this.weapon] === w.capacity || this.reserve[this.weapon] <= 0) return false;
    this.reloadTime = w.reload;
    this.emit('reload');
    return true;
  }
  damage(enemy, amount) {
    if (enemy.hp <= 0) return;
    enemy.hp -= amount;
    enemy.flash = 0.18;
    this.emit('hit');
    if (enemy.hp <= 0) {
      this.kills++;
      this.emit('kill');
      if (this.kills === this.enemies.length) this.emit('cleared');
    }
  }
  fire() {
    if (this.status !== 'playing' || this.cooldown > 0 || this.reloadTime > 0) return false;
    if (this.weapon === 'grenade') return this.throwGrenade();
    if (this.ammo[this.weapon] <= 0) { this.reload(); return false; }
    const w = WEAPONS[this.weapon];
    this.ammo[this.weapon]--;
    this.shots++;
    this.cooldown = w.cooldown;
    this.shotFlash = 0.12;
    this.emit('shot', { weapon: this.weapon });
    const candidates = this.enemies.filter(e => e.hp > 0 && distance(e, this.player) < w.range && Math.abs(wrap(Math.atan2(e.y - this.player.y, e.x - this.player.x) - this.player.angle)) < Math.atan2(0.3, distance(e, this.player)) && clearLine(this.mission.map, this.player, e));
    candidates.sort((a, b) => distance(a, this.player) - distance(b, this.player));
    if (candidates[0]) { this.hits++; this.damage(candidates[0], w.damage); }
    return true;
  }
  throwGrenade() {
    if (this.status !== 'playing' || this.grenadeCount <= 0 || this.cooldown > 0 || this.reloadTime > 0) return false;
    this.grenadeCount--;
    this.cooldown = 0.7;
    this.grenades.push({ x: this.player.x, y: this.player.y, vx: Math.cos(this.player.angle) * 6, vy: Math.sin(this.player.angle) * 6, fuse: 1.6 });
    this.emit('throw');
    return true;
  }
  interact() {
    if (this.status !== 'playing') return;
    if (this.kills < this.enemies.length) { this.emit('message', { text: 'Schakel eerst alle vijanden uit.' }); return; }
    if (!this.objectiveDone && distance(this.player, this.mission.objective) < 1.6) {
      this.objectiveDone = true;
      this.emit('objective');
    }
  }
  makeFlow() {
    const start = [Math.floor(this.player.x), Math.floor(this.player.y)];
    this.flow = new Map([[start.join(','), null]]);
    const queue = [start];
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
        if (!solid(this.mission.map, nx, ny) && !this.flow.has(key)) {
          this.flow.set(key, { x: x + 0.5, y: y + 0.5 }); queue.push([nx, ny]);
        }
      }
    }
  }
  update(dt, input = {}) {
    if (this.status !== 'playing') return;
    dt = Math.max(0, Math.min(dt, 0.05));
    this.elapsed += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.shotFlash = Math.max(0, this.shotFlash - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    if (this.reloadTime > 0) {
      this.reloadTime -= dt;
      if (this.reloadTime <= 0) {
        const amount = Math.min(WEAPONS[this.weapon].capacity - this.ammo[this.weapon], this.reserve[this.weapon]);
        this.ammo[this.weapon] += amount; this.reserve[this.weapon] -= amount;
        this.reloadTime = 0; this.emit('loaded');
      }
    }
    const p = this.player;
    p.angle = wrap(p.angle + (input.turn || 0) * dt * 2.1);
    let forward = input.forward || 0, strafe = input.strafe || 0;
    const norm = Math.max(1, Math.hypot(forward, strafe));
    const speed = (input.sprint ? 3.8 : 2.6) * dt / norm;
    this.moving = !!(forward || strafe);
    this.move(p, (Math.cos(p.angle) * forward - Math.sin(p.angle) * strafe) * speed, (Math.sin(p.angle) * forward + Math.cos(p.angle) * strafe) * speed);
    if (input.fire) this.fire();
    this.pathClock -= dt;
    if (this.pathClock <= 0) { this.makeFlow(); this.pathClock = 0.75; }
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.flash = Math.max(0, e.flash - dt);
      e.cooldown -= dt;
      const d = distance(e, p), visible = clearLine(this.mission.map, e, p);
      if (d < 12 && (!visible || d > 4)) {
        const target = visible ? p : this.flow.get(`${Math.floor(e.x)},${Math.floor(e.y)}`);
        if (target) {
          const direction = Math.atan2(target.y - e.y, target.x - e.x);
          this.move(e, Math.cos(direction) * dt * 0.65, Math.sin(direction) * dt * 0.65);
        }
      }
      if (visible && d < 11 && e.cooldown <= 0) {
        e.cooldown = 2.3 + (d / 15);
        e.flash = 0.12;
        p.hp = Math.max(0, p.hp - (d < 3 ? 9 : 6));
        this.hurtFlash = 0.3;
        this.emit('hurt');
      }
    }
    for (const s of this.supplies) {
      if (s.used || distance(p, s) > 0.65) continue;
      if (s.type === 'health' && p.hp >= 100) continue;
      if (s.type === 'health') p.hp = Math.min(100, p.hp + 45);
      else if (s.type === 'ammo') { this.reserve.rifle += 20; this.reserve.pistol += 21; }
      else this.grenadeCount += 2;
      s.used = true; this.emit('pickup', { kind: s.type });
    }
    for (const g of this.grenades) {
      g.fuse -= dt;
      const oldX = g.x, oldY = g.y;
      this.move(g, g.vx * dt, g.vy * dt, 0.08);
      if (g.x === oldX) g.vx *= -0.45;
      if (g.y === oldY) g.vy *= -0.45;
      g.vx *= Math.exp(-1.6 * dt); g.vy *= Math.exp(-1.6 * dt);
      if (g.fuse <= 0) {
        this.explosions.push({ x: g.x, y: g.y, life: 0.55 });
        for (const e of this.enemies) if (distance(g, e) < 3.4 && clearLine(this.mission.map, g, e)) this.damage(e, 160 * (1 - distance(g, e) / 4.2));
        if (distance(g, p) < 2.4 && clearLine(this.mission.map, g, p)) { p.hp = Math.max(0, p.hp - 45 * (1 - distance(g, p) / 2.4)); this.hurtFlash = 0.3; }
        this.emit('explosion');
      }
    }
    this.grenades = this.grenades.filter(g => g.fuse > 0);
    for (const e of this.explosions) e.life -= dt;
    this.explosions = this.explosions.filter(e => e.life > 0);
    if (p.hp <= 0) { this.status = 'dead'; this.emit('dead'); }
    else if (this.objectiveDone && distance(p, this.mission.exit) < 1) { this.status = 'won'; this.emit('won'); }
  }
}
