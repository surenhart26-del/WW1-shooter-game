import { MISSIONS } from './missions.js';
import { Game, WEAPONS, distance } from './engine.js';
import { Renderer } from './renderer.js';

const $ = id => document.getElementById(id);
const canvas = $('game');
const renderer = new Renderer(canvas);
function resizeGame() {
  canvas.width = Math.max(240, Math.min(1920, Math.round(540 * innerWidth / innerHeight / 2) * 2));
  canvas.height = 540;
  renderer.depth = new Float32Array(canvas.width);
  renderer.ctx.imageSmoothingEnabled = false;
  if (game) renderer.render(game, game.elapsed);
}
const backdrop = new Renderer($('backdrop'));
backdrop.renderBackdrop(0);
let completed = [];
try {
  const saved = JSON.parse(localStorage.getItem('frontline1916-progress') || '[]');
  if (Array.isArray(saved)) completed = [...new Set(saved.filter(id => MISSIONS.some(m => m.id === id)))];
} catch { /* Storage can be unavailable in private browsing. */ }
let game = null, missionIndex = 0, paused = false, lastTime = 0, soundEnabled = false;
let audioContext, toastTimer, hitTimer;
const keys = new Set();
const touchKeys = new Set();
let mouseDown = false;

function audio(type) {
  if (!soundEnabled) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const t = audioContext.currentTime;
    const gain = audioContext.createGain();
    gain.connect(audioContext.destination);
    if (['shot', 'explosion', 'hurt'].includes(type)) {
      const duration = type === 'explosion' ? 0.65 : 0.18;
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
      const source = audioContext.createBufferSource();
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = type === 'explosion' ? 450 : 1700;
      source.buffer = buffer; source.connect(filter); filter.connect(gain);
      gain.gain.setValueAtTime(type === 'hurt' ? 0.12 : 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      source.start(t); source.stop(t + duration);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    } else {
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(type === 'hit' ? 560 : type === 'won' ? 660 : 220, t);
      oscillator.frequency.exponentialRampToValueAtTime(type === 'won' ? 990 : 90, t + 0.15);
      gain.gain.setValueAtTime(0.06, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      oscillator.connect(gain); oscillator.start(); oscillator.stop(t + 0.2);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }
  } catch { /* Sound is optional; gameplay remains available. */ }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  $('sound').innerHTML = soundEnabled ? 'GELUID AAN <span>◉</span>' : 'GELUID UIT <span>◌</span>';
  $('sound').setAttribute('aria-pressed', String(soundEnabled));
  $('sound').setAttribute('aria-label', soundEnabled ? 'Geluid uitzetten' : 'Geluid aanzetten');
  if (soundEnabled) audio('pickup');
}

function missionArt(canvas, m, index) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = m.palette.ground; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-0.22); ctx.scale(1.1, 0.8); ctx.translate(-80, -80);
  m.map.forEach((row, y) => [...row].forEach((cell, x) => {
    ctx.fillStyle = cell === '#' ? m.palette.wall : m.palette.ground;
    ctx.fillRect(x * 8, y * 8, 7, 7);
  }));
  ctx.strokeStyle = '#dac28e'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(m.spawn.x * 8, m.spawn.y * 8); ctx.lineTo(80, 80); ctx.lineTo(m.objective.x * 8, m.objective.y * 8); ctx.stroke();
  ctx.fillStyle = '#e9d29c'; ctx.beginPath(); ctx.arc(m.objective.x * 8, m.objective.y * 8, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  const gradient = ctx.createLinearGradient(0, 0, 0, h); gradient.addColorStop(0, '#1110'); gradient.addColorStop(1, '#15201999'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f0e7cc88'; ctx.font = '8px monospace'; ctx.fillText(`SECTOR ${String.fromCharCode(65 + index)} / ${m.year}`, 12, h - 12);
}

function updateMenu() {
  $('progress-label').textContent = `${completed.length} / 6 MISSIES VOLTOOID`;
  const next = MISSIONS.findIndex(m => !completed.includes(m.id));
  $('campaign-start').innerHTML = `${completed.length === 0 ? 'START DE CAMPAGNE' : next < 0 ? 'SPEEL OPNIEUW' : 'VERVOLG DE CAMPAGNE'} <span>↗</span>`;
  $('mission-grid').replaceChildren();
  MISSIONS.forEach((mission, index) => {
    const done = completed.includes(mission.id);
    const unlocked = index === 0 || completed.includes(MISSIONS[index - 1].id) || done;
    const button = document.createElement('button');
    button.className = `mission-card${done ? ' completed' : ''}${index === Math.max(0, next) ? ' selected' : ''}`;
    button.disabled = !unlocked;
    button.setAttribute('aria-label', `Missie ${index + 1}: ${mission.title}, ${done ? 'voltooid' : unlocked ? 'beschikbaar' : 'vergrendeld'}`);
    button.innerHTML = `<div class="mission-art"><canvas width="260" height="150" aria-hidden="true"></canvas><span class="mission-number">0${index + 1}</span></div><div class="mission-text"><p class="mission-location">${mission.year} · SECTOR ${String.fromCharCode(65 + index)}</p><h3>${mission.title}</h3><div class="mission-status"><span>${done ? 'VOLTOOID' : unlocked ? 'BESCHIKBAAR' : 'VERGRENDELD'}</span><span>${done ? '✓' : unlocked ? '↗' : '—'}</span></div></div>`;
    missionArt(button.querySelector('canvas'), mission, index);
    button.addEventListener('click', () => briefing(index));
    $('mission-grid').append(button);
  });
}

function briefing(index) {
  missionIndex = index;
  const m = MISSIONS[index];
  $('brief-number').textContent = `VELDBEVEL 0${index + 1} / 06`;
  $('brief-location').textContent = `${m.location} / ${m.year}`;
  $('brief-title').textContent = m.title;
  $('brief-description').textContent = m.description;
  $('brief-objective').textContent = m.objective.label + ' met E.';
  $('briefing').showModal();
}

function toast(text) {
  clearTimeout(toastTimer);
  $('toast').textContent = text; $('toast').classList.add('visible');
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3000);
}

function events(event) {
  audio(event.type);
  switch (event.type) {
    case 'hit':
      clearTimeout(hitTimer); $('hitmarker').hidden = false;
      hitTimer = setTimeout(() => $('hitmarker').hidden = true, 140); break;
    case 'cleared': toast('Sector gezuiverd. Ga naar het gouden missiedoel.'); break;
    case 'objective': toast('Doel veiliggesteld. Bereik de groene uitgang.'); break;
    case 'pickup': toast({ health: '+45 gezondheid', ammo: 'Munitie aangevuld', grenades: '+2 handgranaten' }[event.kind]); break;
    case 'reload': toast('Herladen…'); break;
    case 'message': toast(event.text); break;
    case 'dead': case 'won': finish(event.type === 'won'); break;
  }
}

function unlockPointer() { if (document.pointerLockElement) document.exitPointerLock(); }
function lockPointer() {
  if (matchMedia('(pointer: coarse)').matches) return;
  try { canvas.requestPointerLock()?.catch(() => toast('Gebruik ← → om te richten en spatie om te schieten.')); }
  catch { toast('Gebruik ← → om te richten en spatie om te schieten.'); }
}
function clearInput() { keys.clear(); touchKeys.clear(); mouseDown = false; }

function startMission() {
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  clearInput(); paused = false;
  game = new Game(MISSIONS[missionIndex], events);
  resizeGame();
  $('menu').hidden = true; $('game-screen').hidden = false;
  $('hud-sector').textContent = `MISSIE 0${missionIndex + 1} / 06 · ${game.mission.year}`;
  $('hud-title').textContent = game.mission.title;
  $('hitmarker').hidden = true;
  canvas.focus(); lockPointer();
  updateHUD(); renderer.render(game, 0);
  toast('WASD bewegen · Muis / ← → richten · Klik / spatie schieten');
}

function updateHUD() {
  if (!game) return;
  $('hud-health').textContent = Math.ceil(game.player.hp);
  $('health-fill').style.width = `${game.player.hp}%`;
  $('health-fill').style.background = game.player.hp < 30 ? '#d57b62' : '#c9d8a4';
  $('hud-weapon').textContent = WEAPONS[game.weapon].name.toUpperCase();
  $('hud-ammo').textContent = game.reloadTime > 0 ? '···' : game.weapon === 'grenade' ? game.grenadeCount : game.ammo[game.weapon];
  $('hud-reserve').textContent = game.weapon === 'grenade' ? '' : `/ ${game.reserve[game.weapon]}`;
  $('hud-grenades').textContent = `G · ${game.grenadeCount} GRANATEN`;
  $('hud-kills').textContent = `${game.kills} / ${game.enemies.length}`;
  $('hud-objective').textContent = game.objectiveDone ? 'Bereik de groene uitgang' : game.kills === game.enemies.length ? game.mission.objective.label : 'Schakel de vijandelijke bezetting uit';
  $('interaction').textContent = !game.objectiveDone && distance(game.player, game.mission.objective) < 1.6 ? (game.kills === game.enemies.length ? `[ E ] ${game.mission.objective.label}` : 'Schakel eerst de resterende vijanden uit') : game.objectiveDone ? 'GROENE MARKERING → EXTRACTIE' : '';
}

function pauseGame() {
  if (!game || paused || game.status !== 'playing') return;
  paused = true; clearInput(); unlockPointer(); $('pause').showModal();
}
function resumeGame() {
  $('pause').close(); paused = false; clearInput(); canvas.focus(); lockPointer();
}
function returnToMenu() {
  game = null; paused = false; clearInput(); unlockPointer();
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  $('game-screen').hidden = true; $('menu').hidden = false;
  updateMenu(); $('campaign-start').focus();
}

function finish(won) {
  clearInput(); unlockPointer();
  if (won && !completed.includes(game.mission.id)) {
    completed.push(game.mission.id);
    try { localStorage.setItem('frontline1916-progress', JSON.stringify(completed)); } catch { toast('Opslaan is niet beschikbaar; voortgang blijft deze sessie behouden.'); }
  }
  const final = missionIndex === MISSIONS.length - 1;
  $('result-eyebrow').textContent = won ? 'VELDBERICHT — MISSIE VOLTOOID' : 'VELDBERICHT — TERUGTREKKEN';
  $('result-title').textContent = won ? (final ? 'De linie is veilig.' : 'Sector veiliggesteld.') : 'De linie is gevallen.';
  $('result-description').textContent = won ? (final ? 'Je hebt de laatste missie voltooid. De veldtocht is ten einde. Je kunt elke operatie opnieuw spelen.' : 'Je opdracht is voltooid. De volgende sector wacht op je.') : 'Zoek dekking, houd je munitie in de gaten en gebruik de medische kisten. Probeer deze missie opnieuw.';
  const seconds = Math.floor(game.elapsed);
  $('result-stats').innerHTML = `<span><strong>${game.kills}/${game.enemies.length}</strong>UITGESCHAKELD</span><span><strong>${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}</strong>TIJD</span><span><strong>${game.shots ? Math.round(game.hits / game.shots * 100) : 0}%</strong>RAAK</span>`;
  $('result-next').textContent = won ? (final ? 'TERUG NAAR OPERATIES →' : 'VOLGENDE MISSIE →') : 'PROBEER OPNIEUW →';
  $('result-next').onclick = () => {
    $('result').close();
    if (!won) startMission();
    else if (final) returnToMenu();
    else { missionIndex++; briefing(missionIndex); }
  };
  $('result').showModal();
}

$('campaign-start').onclick = () => briefing(Math.max(0, MISSIONS.findIndex(m => !completed.includes(m.id))));
$('deploy').onclick = startMission;
$('sound').onclick = toggleSound;
$('controls-open').onclick = () => $('controls').showModal();
$('pause-button').onclick = pauseGame;
$('resume').onclick = resumeGame;
$('pause-menu').onclick = returnToMenu;
$('result-menu').onclick = returnToMenu;
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => $(b.dataset.close).close());
$('pause').addEventListener('cancel', e => { e.preventDefault(); resumeGame(); });
$('result').addEventListener('cancel', e => { e.preventDefault(); returnToMenu(); });
$('briefing').addEventListener('cancel', () => { if (game) returnToMenu(); });
document.querySelector('[data-close="briefing"]').onclick = () => { $('briefing').close(); if (game) returnToMenu(); };

const gameplayKeys = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','KeyR','KeyG','KeyE','KeyP','Digit1','Digit2','Digit3']);
document.addEventListener('keydown', event => {
  if (event.code === 'KeyM' && !event.repeat) toggleSound();
  if (!game) return;
  if (gameplayKeys.has(event.code)) event.preventDefault();
  if (event.code === 'KeyP' && !event.repeat && game.status === 'playing') { paused ? resumeGame() : pauseGame(); return; }
  if (event.code === 'Escape' && !paused && game.status === 'playing') { event.preventDefault(); pauseGame(); return; }
  if (paused || game.status !== 'playing') return;
  keys.add(event.code);
  if (event.repeat) return;
  if (event.code === 'Space') game.fire();
  if (event.code === 'KeyR') game.reload();
  if (event.code === 'KeyG') game.throwGrenade();
  if (event.code === 'KeyE') game.interact();
  if (/^Digit[123]$/.test(event.code)) game.select(['rifle','pistol','grenade'][Number(event.code.slice(-1)) - 1]);
});
document.addEventListener('keyup', event => keys.delete(event.code));
document.addEventListener('mousemove', event => {
  if (game && !paused && game.status === 'playing' && document.pointerLockElement === canvas) game.player.angle += event.movementX * 0.0025;
});
canvas.addEventListener('mousedown', event => {
  if (event.button !== 0 || !game || paused || game.status !== 'playing') return;
  if (document.pointerLockElement !== canvas) lockPointer();
  mouseDown = true;
  game.fire();
});
document.addEventListener('mouseup', () => mouseDown = false);
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement) pauseGame(); });
window.addEventListener('blur', pauseGame);
window.addEventListener('resize', resizeGame);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
let touchLook = null;
canvas.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') { touchLook = { id: e.pointerId, x: e.clientX }; canvas.setPointerCapture(e.pointerId); } });
canvas.addEventListener('pointermove', e => {
  if (touchLook?.id === e.pointerId && game && !paused) { game.player.angle += (e.clientX - touchLook.x) * 0.006; touchLook.x = e.clientX; }
});
canvas.addEventListener('pointerup', () => touchLook = null);
canvas.addEventListener('pointercancel', () => touchLook = null);
document.querySelectorAll('[data-hold]').forEach(button => {
  button.addEventListener('pointerdown', e => { e.preventDefault(); button.setPointerCapture(e.pointerId); touchKeys.add(button.dataset.hold); if (button.dataset.hold === 'Space' && game && !paused) game.fire(); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => touchKeys.delete(button.dataset.hold));
});
document.querySelectorAll('[data-action]').forEach(button => button.onclick = () => {
  if (!game || paused) return;
  if (button.dataset.action === 'switch') game.select(['rifle','pistol','grenade'][(['rifle','pistol','grenade'].indexOf(game.weapon) + 1) % 3]);
  if (button.dataset.action === 'reload') game.reload();
  if (button.dataset.action === 'interact') game.interact();
});

function frame(timestamp) {
  const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 0;
  lastTime = timestamp;
  if (game && !paused && game.status === 'playing') {
    const held = code => keys.has(code) || touchKeys.has(code);
    game.update(dt, {
      forward: Number(held('KeyW') || held('ArrowUp')) - Number(held('KeyS') || held('ArrowDown')),
      strafe: Number(held('KeyD')) - Number(held('KeyA')),
      turn: Number(held('ArrowRight')) - Number(held('ArrowLeft')),
      sprint: held('ShiftLeft') || held('ShiftRight'),
      fire: mouseDown || held('Space'),
    });
    renderer.render(game, game.elapsed);
    updateHUD();
  }
  requestAnimationFrame(frame);
}
updateMenu();
requestAnimationFrame(frame);
