import test from 'node:test';
import assert from 'node:assert/strict';
import { MISSIONS } from './missions.js';

test('the campaign has six distinct areas', () => {
  assert.equal(MISSIONS.length, 6);
  for (const key of ['id', 'title', 'location']) {
    assert.equal(new Set(MISSIONS.map((mission) => mission[key])).size, 6);
  }
  assert.equal(new Set(MISSIONS.map((mission) => mission.map.join('\n'))).size, 6);
});

for (const mission of MISSIONS) {
  test(`${mission.title}: all gameplay positions are reachable inside a closed map`, () => {
    assert.equal(mission.map.length, 20);
    for (const row of mission.map) {
      assert.equal(row.length, 20);
      assert.match(row, /^[#.]+$/);
      assert.equal(row[0], '#');
      assert.equal(row[19], '#');
    }
    assert.match(mission.map[0], /^#{20}$/);
    assert.match(mission.map[19], /^#{20}$/);
    assert.ok(mission.enemies.length >= 5 && mission.enemies.length <= 10);

    const key = (x, y) => `${x},${y}`;
    const frontier = [[Math.floor(mission.spawn.x), Math.floor(mission.spawn.y)]];
    const reachable = new Set([key(...frontier[0])]);
    for (let index = 0; index < frontier.length; index++) {
      const [x, y] = frontier[index];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const next = key(x + dx, y + dy);
        if (mission.map[y + dy]?.[x + dx] === '.' && !reachable.has(next)) {
          reachable.add(next);
          frontier.push([x + dx, y + dy]);
        }
      }
    }
    const occupied = new Set();
    for (const entity of [mission.spawn, ...mission.enemies, ...mission.supplies, mission.objective, mission.exit]) {
      const x = Math.floor(entity.x);
      const y = Math.floor(entity.y);
      assert.equal(entity.x % 1, 0.5, 'positions use cell centers');
      assert.equal(entity.y % 1, 0.5, 'positions use cell centers');
      assert.equal(mission.map[y]?.[x], '.', `entity ${key(x, y)} is on a wall`);
      assert.ok(reachable.has(key(x, y)), `entity ${key(x, y)} is unreachable`);
      assert.ok(!occupied.has(key(x, y)), `entities overlap at ${key(x, y)}`);
      occupied.add(key(x, y));
    }
    for (const enemy of mission.enemies) assert.equal(enemy.hp, 100);
    for (const supply of mission.supplies) {
      assert.ok(['health', 'ammo', 'grenades'].includes(supply.type));
    }
  });
}
