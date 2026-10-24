import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, WEAPONS, clearLine, solid } from './engine.js';
import { MISSIONS } from './missions.js';

function fixture({ enemies = [], supplies = [], walls = [] } = {}) {
  const map = Array.from({ length: 10 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) => x === 0 || y === 0 || x === 15 || y === 9 ? '#' : '.'),
  );
  for (const [x, y] of walls) map[y][x] = '#';
  return {
    map: map.map(row => row.join('')),
    spawn: { x: 2.5, y: 4.5, angle: 0 },
    enemies: enemies.map(([x, y]) => ({ x, y, hp: 100 })),
    supplies,
    objective: { x: 12.5, y: 4.5, label: 'Test objective' },
    exit: { x: 13.5, y: 7.5 },
  };
}

function advance(game, seconds, input = {}) {
  for (let frame = 0; frame < Math.ceil(seconds / 0.025); frame++) game.update(0.025, input);
}

test('rifle kills the nearest target and respects its bolt-action cooldown', () => {
  const game = new Game(fixture({ enemies: [[8.5, 4.5], [5.5, 4.5]] }));
  assert.equal(game.fire(), true);
  assert.equal(game.enemies[0].hp, 100, 'distant target should not be hit through the first');
  assert.equal(game.enemies[1].hp, 0);
  assert.equal(game.kills, 1);
  assert.equal(game.ammo.rifle, 9);
  assert.equal(game.hits, 1);
  assert.equal(game.fire(), false);
  assert.equal(game.ammo.rifle, 9, 'cooldown should not spend ammo');
  advance(game, WEAPONS.rifle.cooldown + 0.05);
  assert.equal(game.fire(), true);
  assert.equal(game.enemies[0].hp, 0);
  assert.equal(game.kills, 2);
});

test('M1911 takes three hits and records a kill only once', () => {
  const events = [];
  const game = new Game(fixture({ enemies: [[5.5, 4.5]] }), event => events.push(event.type));
  game.select('pistol');
  assert.equal(game.fire(), true);
  assert.equal(game.enemies[0].hp, 60);
  assert.equal(game.fire(), false);
  advance(game, 0.25);
  game.fire();
  assert.equal(game.enemies[0].hp, 20);
  advance(game, 0.25);
  game.fire();
  assert.ok(game.enemies[0].hp <= 0);
  game.damage(game.enemies[0], 100);
  assert.equal(game.kills, 1);
  assert.equal(events.filter(event => event === 'kill').length, 1);
  assert.equal(game.ammo.pistol, 4);
});

test('cover blocks bullets and targets outside the crosshair are missed', () => {
  const covered = new Game(fixture({ enemies: [[6.5, 4.5]], walls: [[4, 4]] }));
  assert.equal(clearLine(covered.mission.map, covered.player, covered.enemies[0]), false);
  covered.fire();
  assert.equal(covered.enemies[0].hp, 100);
  assert.equal(covered.hits, 0);
  const missed = new Game(fixture({ enemies: [[6.5, 6.5]] }));
  missed.fire();
  assert.equal(missed.enemies[0].hp, 100);
  assert.equal(missed.shots, 1);
});

test('reload transfers only available reserve after its full timer', () => {
  const game = new Game(fixture());
  game.ammo.rifle = 2;
  game.reserve.rifle = 3;
  assert.equal(game.reload(), true);
  assert.equal(game.fire(), false);
  advance(game, 2);
  assert.equal(game.ammo.rifle, 2);
  advance(game, 0.5);
  assert.equal(game.ammo.rifle, 5);
  assert.equal(game.reserve.rifle, 0);
  assert.equal(game.reload(), false);
  assert.equal(game.ammo.pistol, 7, 'reload must not change the other weapon');
});

test('empty magazines start reloading; full magazines and empty reserves cannot reload', () => {
  const game = new Game(fixture());
  assert.equal(game.reload(), false);
  game.ammo.rifle = 0;
  assert.equal(game.fire(), false);
  assert.ok(game.reloadTime > 0);
  advance(game, 2.5);
  assert.equal(game.ammo.rifle, 10);
  assert.equal(game.reserve.rifle, 50);
  game.ammo.rifle = 0;
  game.reserve.rifle = 0;
  assert.equal(game.fire(), false);
  assert.equal(game.reloadTime, 0);
});

test('switching weapons cancels an incomplete reload without creating ammunition', () => {
  const game = new Game(fixture());
  game.ammo.rifle = 1;
  game.reload();
  advance(game, 0.5);
  game.select('pistol');
  assert.equal(game.reloadTime, 0);
  advance(game, 3);
  assert.equal(game.ammo.rifle, 1);
  assert.equal(game.reserve.rifle, 60);
  assert.equal(game.ammo.pistol, 7);
});

test('grenades consume inventory once, wait for a fuse, then damage nearby enemies', () => {
  const events = [];
  const game = new Game(fixture({ enemies: [[6.5, 4.5]] }), event => events.push(event.type));
  game.select('grenade');
  assert.equal(game.fire(), true);
  assert.equal(game.grenadeCount, 2);
  assert.equal(game.grenades.length, 1);
  assert.equal(game.fire(), false);
  advance(game, 1.5);
  assert.equal(game.enemies[0].hp, 100, 'the grenade must not damage before detonation');
  assert.equal(events.includes('explosion'), false);
  advance(game, 0.2);
  assert.equal(game.grenades.length, 0);
  assert.ok(game.enemies[0].hp <= 0);
  assert.equal(events.filter(event => event === 'explosion').length, 1);
  game.grenadeCount = 0;
  assert.equal(game.throwGrenade(), false);
});

test('grenade blast respects solid cover and can injure a player standing too close', () => {
  const game = new Game(fixture({ enemies: [[6.5, 4.5]], walls: [[5, 3], [5, 4], [5, 5]] }));
  game.grenades.push({ x: 4.5, y: 4.5, vx: 0, vy: 0, fuse: 0.01 });
  game.update(0.025);
  assert.equal(game.enemies[0].hp, 100);
  assert.ok(game.player.hp < 100, 'nearby player takes blast damage');
  assert.equal(game.explosions.length, 1);
});

test('movement collides with walls and diagonal input does not increase speed', () => {
  const blocked = new Game(fixture({ walls: [[3, 4]] }));
  advance(blocked, 2, { forward: 1 });
  assert.ok(blocked.player.x < 2.81);
  assert.equal(solid(blocked.mission.map, blocked.player.x, blocked.player.y), false);
  const straight = new Game(fixture());
  const diagonal = new Game(fixture());
  straight.update(0.05, { forward: 1 });
  diagonal.update(0.05, { forward: 1, strafe: 1 });
  const distance = game => Math.hypot(game.player.x - 2.5, game.player.y - 4.5);
  assert.ok(Math.abs(distance(straight) - distance(diagonal)) < 1e-9);
});

test('paused games freeze timers, enemies, movement and firing', () => {
  const game = new Game(fixture({ enemies: [[5.5, 4.5]] }));
  game.status = 'paused';
  const before = JSON.stringify(game);
  advance(game, 4, { forward: 1, fire: true });
  assert.equal(game.fire(), false);
  assert.equal(game.reload(), false);
  assert.equal(game.throwGrenade(), false);
  assert.equal(JSON.stringify(game), before);
});

test('pickups heal with a cap, stay available at full health, and are consumed once', () => {
  const game = new Game(fixture({ supplies: [{ x: 2.5, y: 4.5, type: 'health' }] }));
  game.update(0.025);
  assert.equal(game.supplies[0].used, false);
  game.player.hp = 80;
  game.update(0.025);
  assert.equal(game.player.hp, 100);
  assert.equal(game.supplies[0].used, true);
  game.player.hp = 70;
  game.update(0.025);
  assert.equal(game.player.hp, 70);
});

test('mission progression requires kills, objective interaction, then extraction', () => {
  const game = new Game(fixture({ enemies: [[5.5, 4.5]] }));
  Object.assign(game.player, game.mission.objective);
  game.interact();
  assert.equal(game.objectiveDone, false);
  game.damage(game.enemies[0], 100);
  Object.assign(game.player, game.mission.exit);
  game.update(0.025);
  assert.equal(game.status, 'playing', 'extraction cannot precede the objective');
  game.interact();
  assert.equal(game.objectiveDone, false, 'objective interaction has a limited range');
  Object.assign(game.player, game.mission.objective);
  game.interact();
  assert.equal(game.objectiveDone, true);
  Object.assign(game.player, game.mission.exit);
  game.update(0.025);
  assert.equal(game.status, 'won');
});

for (const mission of MISSIONS) {
  test(`${mission.title}: its actual objective and extraction complete the mission`, () => {
    const game = new Game(mission);
    for (const enemy of game.enemies) game.damage(enemy, 100);
    Object.assign(game.player, mission.objective);
    game.interact();
    assert.equal(game.objectiveDone, true);
    Object.assign(game.player, mission.exit);
    game.update(0.025);
    assert.equal(game.status, 'won');
  });
}

test('enemy fire causes death, emits it once, and death freezes future updates', () => {
  const events = [];
  const game = new Game(fixture({ enemies: [[5.5, 4.5]] }), event => events.push(event.type));
  game.player.hp = 1;
  game.enemies[0].cooldown = 0;
  game.update(0.025);
  assert.equal(game.player.hp, 0);
  assert.equal(game.status, 'dead');
  const elapsed = game.elapsed;
  advance(game, 2, { forward: 1, fire: true });
  assert.equal(game.elapsed, elapsed);
  assert.equal(events.filter(event => event === 'dead').length, 1);
});
