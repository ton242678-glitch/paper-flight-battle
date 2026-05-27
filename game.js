(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const levelEl = document.getElementById("level");
  const timerEl = document.getElementById("timer");
  const livesEl = document.getElementById("lives");
  const stageEl = document.getElementById("stage");
  const modeButton = document.getElementById("modeButton");
  const levelSelectButton = document.getElementById("levelSelectButton");
  const startButton = document.getElementById("startButton");
  const soundButton = document.getElementById("soundButton");
  const levelSelect = document.getElementById("levelSelect");
  const levelSelectClose = document.getElementById("levelSelectClose");
  const levelButtons = Array.from(document.querySelectorAll(".level-choice"));
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");
  const overlayKicker = document.getElementById("overlayKicker");
  const bossMeter = document.getElementById("bossMeter");
  const bossName = document.getElementById("bossName");
  const bossFill = document.getElementById("bossFill");

  const WORLD = { width: 960, height: 620 };
  const COLORS = {
    ink: "#18202e",
    paper: "#fffdfa",
    fold: "#d7e6ec",
    red: "#d84545",
    green: "#2c7f74",
    blue: "#3868a8",
    gold: "#d7a83f",
  };
  const LEVEL_SELECT_UNLOCK_KEY = "paperFlightLevelSelectUnlocked";

  const state = {
    running: false,
    gameOver: false,
    levelSelectUnlocked: loadLevelSelectUnlocked(),
    mode: "campaign",
    levelIndex: 0,
    levelElapsed: 0,
    levelStartScore: 0,
    levelDamage: 0,
    levelComplete: false,
    campaignComplete: false,
    bossSpawned: false,
    endlessBossCount: 0,
    endlessNextBossAt: 0,
    endlessLastBossIndex: -1,
    score: 0,
    lives: 3,
    difficulty: 1,
    lastTime: 0,
    enemyTimer: 0,
    shotTimer: 0,
    bossShotTimer: 0,
    bossActive: false,
    boss: null,
    ratings: [],
    shake: 0,
    mouseInside: false,
  };

  const player = {
    x: WORLD.width * 0.5,
    y: WORLD.height - 92,
    targetX: WORLD.width * 0.5,
    targetY: WORLD.height - 92,
    radius: 23,
    invulnerable: 0,
  };

  const bullets = [];
  const enemies = [];
  const enemyBullets = [];
  const lasers = [];
  const particles = [];
  const floatText = [];
  const trails = [];

  let muted = false;
  let audioCtx = null;
  let masterGain = null;
  let musicGain = null;
  let musicTimer = null;
  let musicStep = 0;

  const MUSIC_NORMAL = [
    { note: 392, bass: 196 },
    { note: 523.25 },
    { note: 659.25 },
    { note: 523.25 },
    { note: 440, bass: 220 },
    { note: 587.33 },
    { note: 698.46 },
    { rest: true },
    { note: 392, bass: 196 },
    { note: 493.88 },
    { note: 587.33 },
    { note: 493.88 },
    { note: 349.23, bass: 174.61 },
    { note: 440 },
    { note: 523.25 },
    { rest: true },
  ];

  const MUSIC_BOSS = [
    { note: 220, bass: 110 },
    { note: 261.63 },
    { note: 329.63, bass: 164.81 },
    { note: 261.63 },
    { note: 246.94, bass: 123.47 },
    { note: 293.66 },
    { note: 349.23, bass: 174.61 },
    { note: 293.66 },
  ];

  const BOSS_VARIANTS = [
    {
      kind: "dart",
      name: "Red Dart",
      label: "DART",
      color: "#fff8ec",
      accent: "rgba(216, 69, 69, 0.52)",
      bulletColor: COLORS.red,
      radius: 72,
      hpBonus: 0,
      reward: 200,
      speed: 112,
      shotInterval: 1.02,
    },
    {
      kind: "kite",
      name: "Blue Kite",
      label: "KITE",
      color: "#f6fbff",
      accent: "rgba(56, 104, 168, 0.48)",
      bulletColor: COLORS.blue,
      radius: 78,
      hpBonus: 5,
      reward: 230,
      speed: 1.05,
      shotInterval: 1.28,
    },
    {
      kind: "fortress",
      name: "Paper Fort",
      label: "FORT",
      color: "#fffbea",
      accent: "rgba(215, 168, 63, 0.54)",
      bulletColor: COLORS.gold,
      radius: 84,
      hpBonus: 9,
      reward: 260,
      speed: 74,
      shotInterval: 1.08,
    },
    {
      kind: "crane",
      name: "Laser Crane",
      label: "CRANE",
      color: "#f4fff8",
      accent: "rgba(44, 127, 116, 0.5)",
      bulletColor: COLORS.green,
      radius: 76,
      hpBonus: 12,
      reward: 290,
      speed: 0.92,
      shotInterval: 1.45,
    },
    {
      kind: "fan",
      name: "Storm Fan",
      label: "FAN",
      color: "#fff7f7",
      accent: "rgba(216, 69, 69, 0.34)",
      bulletColor: COLORS.red,
      radius: 82,
      hpBonus: 16,
      reward: 330,
      speed: 1.26,
      shotInterval: 0.98,
    },
  ];

  const LEVELS = [
    { name: "草稿纸航线", bossAt: 15, difficulty: 1.55, bossIndex: 0, targetScore: 640 },
    { name: "蓝格本乱流", bossAt: 18, difficulty: 2, bossIndex: 1, targetScore: 860 },
    { name: "订书钉防线", bossAt: 21, difficulty: 2.55, bossIndex: 2, targetScore: 1120 },
    { name: "折纸激光塔", bossAt: 24, difficulty: 3.15, bossIndex: 3, targetScore: 1420 },
    { name: "期末试卷风暴", bossAt: 27, difficulty: 3.8, bossIndex: 4, targetScore: 1780 },
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function currentLevel() {
    return LEVELS[state.levelIndex] || LEVELS[0];
  }

  function isEndless() {
    return state.mode === "endless";
  }

  function formatTime(seconds) {
    return `${Math.max(0, Math.ceil(seconds))}s`;
  }

  function nextEndlessBossDelay() {
    const pressure = Math.min(11, state.endlessBossCount * 1.35 + state.levelElapsed / 30);
    return rand(Math.max(12, 22 - pressure), Math.max(18, 32 - pressure));
  }

  function updateModeButton() {
    modeButton.textContent = isEndless() ? "模式 无尽" : "模式 关卡";
  }

  function loadLevelSelectUnlocked() {
    try {
      return window.localStorage?.getItem(LEVEL_SELECT_UNLOCK_KEY) === "1";
    } catch (_error) {
      return false;
    }
  }

  function saveLevelSelectUnlocked() {
    try {
      window.localStorage?.setItem(LEVEL_SELECT_UNLOCK_KEY, "1");
    } catch (_error) {
      // Local storage can be unavailable in private or restricted contexts.
    }
  }

  function updateLevelSelectButton() {
    levelSelectButton.disabled = !state.levelSelectUnlocked;
    levelSelectButton.textContent = state.levelSelectUnlocked ? "选关" : "选关 锁定";
    levelSelectButton.title = state.levelSelectUnlocked ? "选择已解锁关卡" : "完整通关一次关卡模式后开启";
  }

  function unlockLevelSelect() {
    if (state.levelSelectUnlocked) return;
    state.levelSelectUnlocked = true;
    saveLevelSelectUnlocked();
    updateLevelSelectButton();
  }

  function prepareModeScreen() {
    stopMusic();
    state.running = false;
    state.gameOver = false;
    state.levelIndex = 0;
    state.levelElapsed = 0;
    state.levelStartScore = 0;
    state.levelDamage = 0;
    state.levelComplete = false;
    state.campaignComplete = false;
    state.bossSpawned = false;
    state.endlessBossCount = 0;
    state.endlessNextBossAt = 0;
    state.endlessLastBossIndex = -1;
    state.score = 0;
    state.lives = 3;
    state.difficulty = isEndless() ? 1.85 : LEVELS[0].difficulty;
    state.enemyTimer = 0;
    state.shotTimer = 0;
    state.bossShotTimer = 0;
    state.bossActive = false;
    state.boss = null;
    state.shake = 0;
    player.x = WORLD.width * 0.5;
    player.y = WORLD.height - 92;
    player.targetX = player.x;
    player.targetY = player.y;
    player.invulnerable = 0;
    bullets.length = 0;
    enemies.length = 0;
    enemyBullets.length = 0;
    lasers.length = 0;
    particles.length = 0;
    floatText.length = 0;
    trails.length = 0;
    startButton.textContent = "开始";
    updateModeButton();
    updateLevelSelectButton();
    updateHud();
    showOverlay(
      isEndless() ? "Endless" : "Campaign",
      isEndless() ? "无尽模式" : "关卡模式",
      isEndless() ? "Boss 会随机出现，难度持续上升" : "5 个关卡，每关最后都有 Boss 和评分",
    );
  }

  function distancePointToSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSq = dx * dx + dy * dy || 1;
    const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq, 0, 1);
    const x = start.x + dx * t;
    const y = start.y + dy * t;
    return Math.hypot(point.x - x, point.y - y);
  }

  function initAudio() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      muted = true;
      updateSoundButton();
      return;
    }
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    musicGain = audioCtx.createGain();
    masterGain.gain.value = 0.62;
    musicGain.gain.value = 0.0001;
    musicGain.connect(masterGain);
    masterGain.connect(audioCtx.destination);
  }

  function playTone({ frequency, duration, type = "triangle", volume = 0.2, slide = 0 }) {
    if (muted || !audioCtx || !masterGain) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (slide) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, frequency + slide), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  function playNoise(duration = 0.12, volume = 0.18, filterFrequency = 1700) {
    if (muted || !audioCtx || !masterGain) return;
    const now = audioCtx.currentTime;
    const length = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
    const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < length; i += 1) {
      previous = previous * 0.72 + (Math.random() * 2 - 1) * 0.28;
      data[i] = previous;
    }
    const source = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = filterFrequency;
    filter.Q.value = 2.8;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  function playMusicTone(frequency, startTime, duration, volume, type = "triangle") {
    if (muted || !audioCtx || !musicGain || !frequency) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.04);
  }

  function scheduleMusicStep() {
    musicTimer = null;
    if (muted || !state.running || !audioCtx || !musicGain) return;

    const bossMode = state.bossActive;
    const pattern = bossMode ? MUSIC_BOSS : MUSIC_NORMAL;
    const step = pattern[musicStep % pattern.length];
    const now = audioCtx.currentTime;
    const beat = bossMode ? 0.19 : 0.245;

    if (!step.rest) {
      playMusicTone(step.note, now, beat * 0.74, bossMode ? 0.09 : 0.07, bossMode ? "sawtooth" : "triangle");
      if (step.bass) {
        playMusicTone(step.bass, now, beat * 1.4, bossMode ? 0.066 : 0.052, "sine");
      }
    }

    musicStep += 1;
    musicTimer = setTimeout(scheduleMusicStep, beat * 1000);
  }

  function startMusic() {
    if (muted || !state.running || !audioCtx || !musicGain || musicTimer) return;
    const now = audioCtx.currentTime;
    if (musicGain.gain.cancelScheduledValues) musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value || 0.0001), now);
    musicGain.gain.exponentialRampToValueAtTime(0.55, now + 0.45);
    scheduleMusicStep();
  }

  function stopMusic() {
    if (musicTimer) {
      clearTimeout(musicTimer);
      musicTimer = null;
    }
    if (!audioCtx || !musicGain) return;
    const now = audioCtx.currentTime;
    if (musicGain.gain.cancelScheduledValues) musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value || 0.0001), now);
    musicGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  }

  const sfx = {
    shoot() {
      playNoise(0.045, 0.17, 2600);
      playTone({ frequency: 760, duration: 0.045, type: "sine", volume: 0.12, slide: 180 });
    },
    hit() {
      playNoise(0.08, 0.22, 1900);
      playTone({ frequency: 360, duration: 0.075, type: "triangle", volume: 0.15, slide: -90 });
    },
    hurt() {
      playNoise(0.16, 0.3, 900);
      playTone({ frequency: 180, duration: 0.18, type: "sawtooth", volume: 0.14, slide: -70 });
    },
    boss() {
      playNoise(0.32, 0.24, 720);
      playTone({ frequency: 180, duration: 0.36, type: "triangle", volume: 0.18, slide: 260 });
      setTimeout(() => playTone({ frequency: 300, duration: 0.22, type: "triangle", volume: 0.14, slide: 180 }), 120);
    },
    victory() {
      [420, 560, 760, 980].forEach((freq, index) => {
        setTimeout(() => playTone({ frequency: freq, duration: 0.12, type: "triangle", volume: 0.16 }), index * 80);
      });
      playNoise(0.24, 0.18, 2300);
    },
    gameOver() {
      [300, 230, 170].forEach((freq, index) => {
        setTimeout(() => playTone({ frequency: freq, duration: 0.2, type: "sine", volume: 0.16, slide: -35 }), index * 120);
      });
      playNoise(0.32, 0.22, 620);
    },
  };

  function updateSoundButton() {
    soundButton.textContent = muted ? "声音 关" : "声音 开";
    soundButton.setAttribute("aria-pressed", String(!muted));
  }

  function resetGame() {
    stopMusic();
    musicStep = 0;
    state.score = 0;
    state.ratings = [];
    state.campaignComplete = false;
    if (isEndless()) {
      startEndless();
    } else {
      startLevel(0);
    }
  }

  function startEndless() {
    stopMusic();
    state.running = true;
    state.gameOver = false;
    state.levelIndex = 0;
    state.levelElapsed = 0;
    state.levelStartScore = 0;
    state.levelDamage = 0;
    state.levelComplete = false;
    state.campaignComplete = false;
    state.bossSpawned = false;
    state.endlessBossCount = 0;
    state.endlessNextBossAt = nextEndlessBossDelay();
    state.endlessLastBossIndex = -1;
    state.lives = 3;
    state.difficulty = 1.85;
    state.enemyTimer = 0;
    state.shotTimer = 0;
    state.bossShotTimer = 0;
    state.bossActive = false;
    state.boss = null;
    state.shake = 0;
    player.x = WORLD.width * 0.5;
    player.y = WORLD.height - 92;
    player.targetX = player.x;
    player.targetY = player.y;
    player.invulnerable = 0;
    bullets.length = 0;
    enemies.length = 0;
    enemyBullets.length = 0;
    lasers.length = 0;
    particles.length = 0;
    floatText.length = 0;
    trails.length = 0;
    overlay.classList.remove("is-visible");
    startButton.textContent = "重新开始";
    addFloatText(WORLD.width * 0.5, 118, "无尽模式", COLORS.red);
    updateHud();
    startMusic();
  }

  function startLevel(index) {
    const level = LEVELS[index];
    stopMusic();
    state.running = true;
    state.gameOver = false;
    state.levelIndex = index;
    state.levelElapsed = 0;
    state.levelStartScore = state.score;
    state.levelDamage = 0;
    state.levelComplete = false;
    state.campaignComplete = false;
    state.bossSpawned = false;
    state.lives = 3;
    state.difficulty = level.difficulty;
    state.enemyTimer = 0;
    state.shotTimer = 0;
    state.bossShotTimer = 0;
    state.bossActive = false;
    state.boss = null;
    state.shake = 0;
    player.x = WORLD.width * 0.5;
    player.y = WORLD.height - 92;
    player.targetX = player.x;
    player.targetY = player.y;
    player.invulnerable = 0;
    bullets.length = 0;
    enemies.length = 0;
    enemyBullets.length = 0;
    lasers.length = 0;
    particles.length = 0;
    floatText.length = 0;
    trails.length = 0;
    overlay.classList.remove("is-visible");
    startButton.textContent = "重新开始";
    addFloatText(WORLD.width * 0.5, 118, `第 ${index + 1} 关`, COLORS.blue);
    updateHud();
    startMusic();
  }

  function updateHud() {
    const level = currentLevel();
    scoreEl.textContent = String(state.score);
    levelEl.textContent = isEndless() ? "无尽" : `${state.levelIndex + 1}/${LEVELS.length}`;
    if (state.bossActive) {
      timerEl.textContent = "Boss";
    } else if (state.levelComplete || state.campaignComplete) {
      timerEl.textContent = "完成";
    } else if (state.running) {
      timerEl.textContent = isEndless()
        ? formatTime(state.endlessNextBossAt - state.levelElapsed)
        : formatTime(level.bossAt - state.levelElapsed);
    } else {
      timerEl.textContent = "--";
    }
    livesEl.textContent = String(state.lives);
    stageEl.textContent = state.bossActive
      ? "Boss"
      : state.levelComplete
        ? "评分"
        : state.running
          ? isEndless()
            ? `无尽 ${state.endlessBossCount}`
            : level.name
          : "准备";
    bossMeter.classList.toggle("is-active", state.bossActive && !!state.boss);
    bossMeter.setAttribute("aria-hidden", state.bossActive ? "false" : "true");
    if (state.boss) {
      const ratio = clamp(state.boss.hp / state.boss.maxHp, 0, 1);
      bossName.textContent = state.boss.variant.name;
      bossFill.style.transform = `scaleX(${ratio})`;
    } else {
      bossName.textContent = "Boss";
      bossFill.style.transform = "scaleX(1)";
    }
  }

  function showOverlay(kicker, title, text) {
    overlayKicker.textContent = kicker;
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlay.classList.add("is-visible");
  }

  function showLevelSelect() {
    if (!state.levelSelectUnlocked) {
      showOverlay("Locked", "选关未解锁", "完整通关一次关卡模式后开启");
      return;
    }
    state.mode = "campaign";
    prepareModeScreen();
    levelSelect.classList.add("is-visible");
    levelSelect.setAttribute("aria-hidden", "false");
  }

  function hideLevelSelect() {
    levelSelect.classList.remove("is-visible");
    levelSelect.setAttribute("aria-hidden", "true");
  }

  async function startSelectedLevel(index) {
    if (!state.levelSelectUnlocked) {
      showOverlay("Locked", "选关未解锁", "完整通关一次关卡模式后开启");
      return;
    }
    initAudio();
    if (audioCtx?.state === "suspended") {
      await audioCtx.resume();
    }
    state.mode = "campaign";
    state.score = 0;
    state.ratings = [];
    state.campaignComplete = false;
    hideLevelSelect();
    updateModeButton();
    startLevel(index);
  }

  function gameOver() {
    state.running = false;
    state.gameOver = true;
    state.levelComplete = false;
    startButton.textContent = "重新开始";
    const detail = isEndless() ? `击败 Boss ${state.endlessBossCount} 只 · 最终分数 ${state.score}` : `最终分数 ${state.score}`;
    showOverlay("Game Over", "坠落", detail);
    stopMusic();
    sfx.gameOver();
    updateHud();
  }

  function addFloatText(x, y, text, color = COLORS.red) {
    floatText.push({ x, y, text, color, life: 0.8, maxLife: 0.8 });
  }

  function spawnBurst(x, y, color, count = 12, power = 160) {
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x,
        y,
        vx: rand(-power, power),
        vy: rand(-power, power),
        size: rand(4, 11),
        angle: rand(0, Math.PI * 2),
        spin: rand(-8, 8),
        life: rand(0.32, 0.68),
        maxLife: 0.68,
        color,
      });
    }
  }

  function spawnEnemy() {
    const big = Math.random() < 0.32 + state.difficulty * 0.034;
    const tough = state.difficulty > 1.9 && Math.random() < Math.min(0.42, (state.difficulty - 1.9) * 0.16);
    const elite = state.difficulty > 3.2 && Math.random() < Math.min(0.18, (state.difficulty - 3.2) * 0.08);
    const radius = big ? rand(22, 30) : rand(15, 22);
    const type = big ? "plane" : "ball";
    enemies.push({
      x: rand(radius + 12, WORLD.width - radius - 12),
      y: -radius - 18,
      radius,
      hp: (big ? 2 : 1) + (tough ? 1 : 0) + (elite ? 1 : 0),
      score: big ? (elite ? 70 : tough ? 55 : 40) : tough ? 30 : 20,
      speed: rand(92, 150) + state.difficulty * 19,
      drift: rand(-48, 48),
      wave: rand(0, Math.PI * 2),
      type,
      angle: rand(-0.2, 0.2),
      creases:
        type === "ball"
          ? Array.from({ length: 5 }, () => ({
              x1: rand(-0.55, 0.2),
              y1: rand(-0.6, 0.2),
              cx: rand(-0.2, 0.5),
              cy: rand(-0.3, 0.5),
              x2: rand(-0.5, 0.6),
              y2: rand(-0.15, 0.55),
            }))
          : [],
    });
  }

  function spawnBoss() {
    const variantIndex = isEndless() ? randomEndlessBossIndex() : currentLevel().bossIndex;
    const variant = BOSS_VARIANTS[variantIndex];
    const maxHp = isEndless()
      ? 48 + variant.hpBonus + Math.floor(state.difficulty * 13) + state.endlessBossCount * 7
      : 50 + variant.hpBonus + Math.floor(currentLevel().difficulty * 16);

    state.bossActive = true;
    state.bossSpawned = true;
    state.bossShotTimer = 0.72;
    state.boss = {
      x: WORLD.width * 0.5,
      y: -84,
      radius: variant.radius,
      hp: maxHp,
      maxHp,
      variant,
      direction: 1,
      entry: true,
      phase: rand(0, Math.PI * 2),
      shotCount: 0,
    };
    enemies.length = Math.min(enemies.length, 2);
    lasers.length = 0;
    addFloatText(WORLD.width * 0.5, 118, `${variant.name} 来袭`, variant.bulletColor);
    sfx.boss();
    updateHud();
  }

  function randomEndlessBossIndex() {
    let index = Math.floor(rand(0, BOSS_VARIANTS.length));
    if (BOSS_VARIANTS.length > 1 && index === state.endlessLastBossIndex) {
      index = (index + 1 + Math.floor(rand(0, BOSS_VARIANTS.length - 1))) % BOSS_VARIANTS.length;
    }
    state.endlessLastBossIndex = index;
    return index;
  }

  function bossShoot() {
    if (!state.boss) return;
    const boss = state.boss;
    const variant = boss.variant;
    if (variant.kind === "kite") {
      const count = 10;
      const spin = boss.shotCount * 0.34;
      for (let i = 0; i < count; i += 1) {
        const angle = spin + (Math.PI * 2 * i) / count;
        enemyBullets.push({
          x: boss.x,
          y: boss.y + 34,
          vx: Math.cos(angle) * 145,
          vy: Math.sin(angle) * 145,
          radius: 7,
          life: 5,
          color: variant.bulletColor,
          shape: "diamond",
        });
      }
    } else if (variant.kind === "fortress") {
      const offsets = [-88, -58, -29, 0, 29, 58, 88];
      offsets.forEach((offset, index) => {
        enemyBullets.push({
          x: boss.x + offset,
          y: boss.y + 48,
          vx: ((index % 2 === 0 ? -1 : 1) * 18) + Math.sin(boss.shotCount) * 16,
          vy: 160 + index * 5,
          radius: 8,
          life: 5.5,
          color: variant.bulletColor,
          shape: "strip",
        });
      });
      [-0.42, 0.42].forEach((offset) => {
        const angle = Math.PI * 0.5 + offset;
        enemyBullets.push({
          x: boss.x,
          y: boss.y + 58,
          vx: Math.cos(angle) * 185,
          vy: Math.sin(angle) * 185,
          radius: 7,
          life: 5,
          color: variant.bulletColor,
          shape: "diamond",
        });
      });
    } else if (variant.kind === "crane") {
      const aim = Math.atan2(player.y - boss.y, player.x - boss.x);
      spawnLaser(boss.x, boss.y + 36, aim, 900, 22, variant.bulletColor);
      [-0.32, 0.32].forEach((offset) => {
        const angle = aim + offset;
        enemyBullets.push({
          x: boss.x,
          y: boss.y + 42,
          vx: Math.cos(angle) * 180,
          vy: Math.sin(angle) * 180,
          radius: 7,
          life: 4.8,
          color: variant.bulletColor,
          shape: "diamond",
        });
      });
    } else if (variant.kind === "fan") {
      const pattern = boss.shotCount % 5;
      if (pattern === 0) {
        const count = 12;
        const spin = boss.shotCount * 0.58;
        for (let i = 0; i < count; i += 1) {
          const angle = spin + (Math.PI * 2 * i) / count;
          const speed = 124 + (i % 3) * 26;
          enemyBullets.push({
            x: boss.x + Math.cos(angle) * 24,
            y: boss.y + Math.sin(angle) * 16,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 7,
            life: 5.2,
            color: variant.bulletColor,
            shape: i % 2 === 0 ? "diamond" : "square",
          });
        }
      } else if (pattern === 1) {
        const aim = Math.atan2(player.y - boss.y, player.x - boss.x);
        [-0.56, -0.36, -0.18, 0, 0.18, 0.36, 0.56].forEach((offset, index) => {
          const angle = aim + offset;
          const speed = 178 + (index % 3) * 20;
          enemyBullets.push({
            x: boss.x,
            y: boss.y + 46,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 7,
            life: 4.8,
            color: variant.bulletColor,
            shape: "diamond",
          });
        });
      } else if (pattern === 2) {
        for (let i = 0; i < 6; i += 1) {
          const y = boss.y + 18 + i * 31;
          const drift = 42 + i * 5;
          enemyBullets.push({
            x: -18,
            y,
            vx: 138 + drift,
            vy: 78 + i * 7,
            radius: 8,
            life: 5.6,
            color: variant.bulletColor,
            shape: "strip",
          });
          enemyBullets.push({
            x: WORLD.width + 18,
            y,
            vx: -138 - drift,
            vy: 78 + i * 7,
            radius: 8,
            life: 5.6,
            color: variant.bulletColor,
            shape: "strip",
          });
        }
      } else if (pattern === 3) {
        [-0.56, 0, 0.56].forEach((offset) => {
          spawnLaser(boss.x, boss.y + 46, Math.PI * 0.5 + offset + Math.sin(boss.phase) * 0.12, 820, 15, variant.bulletColor);
        });
      } else {
        [-250, -180, -110, -40, 40, 110, 180, 250].forEach((offset, index) => {
          const x = clamp(boss.x + offset, 28, WORLD.width - 28);
          enemyBullets.push({
            x,
            y: boss.y + 42,
            vx: -offset * 0.22,
            vy: 176 + (index % 2) * 24,
            radius: 8,
            life: 5.4,
            color: variant.bulletColor,
            shape: index % 2 === 0 ? "strip" : "diamond",
          });
        });
        const aim = Math.atan2(player.y - boss.y, player.x - boss.x);
        [-0.18, 0, 0.18].forEach((offset) => {
          const angle = aim + offset;
          enemyBullets.push({
            x: boss.x,
            y: boss.y + 54,
            vx: Math.cos(angle) * 220,
            vy: Math.sin(angle) * 220,
            radius: 7,
            life: 4.4,
            color: variant.bulletColor,
            shape: "square",
          });
        });
      }
    } else {
      const base = Math.atan2(player.y - boss.y, player.x - boss.x);
      const spread = [-0.36, -0.18, 0, 0.18, 0.36];
      spread.forEach((offset) => {
        const angle = base + offset + Math.sin(boss.shotCount * 0.8) * 0.05;
        enemyBullets.push({
          x: boss.x,
          y: boss.y + 50,
          vx: Math.cos(angle) * 190,
          vy: Math.sin(angle) * 190,
          radius: 8,
          life: 5,
          color: variant.bulletColor,
          shape: "square",
        });
      });
    }
    boss.shotCount += 1;
    playNoise(0.07, 0.13, 1150);
  }

  function spawnLaser(x, y, angle, length, width, color) {
    lasers.push({
      x,
      y,
      angle,
      length,
      width,
      color,
      warmup: 0.56,
      duration: 0.38,
      life: 0.94,
      hit: false,
    });
    playTone({ frequency: 1180, duration: 0.12, type: "sawtooth", volume: 0.1, slide: -260 });
  }

  function playerShoot() {
    bullets.push({
      x: player.x - 10,
      y: player.y - 28,
      vx: -18,
      vy: -430,
      radius: 5,
      life: 1.4,
    });
    bullets.push({
      x: player.x + 10,
      y: player.y - 28,
      vx: 18,
      vy: -430,
      radius: 5,
      life: 1.4,
    });
    sfx.shoot();
  }

  function damagePlayer() {
    if (player.invulnerable > 0 || !state.running) return;
    state.lives -= 1;
    state.levelDamage += 1;
    player.invulnerable = 1.3;
    state.shake = 0.35;
    spawnBurst(player.x, player.y, COLORS.red, 18, 220);
    sfx.hurt();
    if (state.lives <= 0) {
      state.lives = 0;
      gameOver();
    }
    updateHud();
  }

  function gainScore(amount, x, y) {
    state.score += amount;
    addFloatText(x, y, `+${amount}`, COLORS.green);
    updateHud();
  }

  function defeatBoss() {
    if (!state.boss) return;
    const reward = state.boss.variant.reward;
    spawnBurst(state.boss.x, state.boss.y, state.boss.variant.bulletColor, 46, 280);
    addFloatText(state.boss.x, state.boss.y, `+${reward}`, COLORS.gold);
    state.score += reward;
    if (isEndless()) {
      finishEndlessBoss();
    } else {
      finishLevel();
    }
  }

  function finishEndlessBoss() {
    state.endlessBossCount += 1;
    state.bossActive = false;
    state.boss = null;
    state.bossSpawned = false;
    state.endlessNextBossAt = state.levelElapsed + nextEndlessBossDelay();
    enemies.length = Math.min(enemies.length, 4);
    enemyBullets.length = 0;
    lasers.length = 0;
    state.shake = 0.4;
    addFloatText(WORLD.width * 0.5, 120, `Boss x${state.endlessBossCount}`, COLORS.gold);
    sfx.victory();
    updateHud();
  }

  function calculateRating(levelScore, levelTime) {
    const level = currentLevel();
    const scorePart = clamp(levelScore / level.targetScore, 0, 1) * 45;
    const damagePart = Math.max(0, 35 - state.levelDamage * 12);
    const speedPart = levelTime <= level.bossAt + 28 ? 20 : levelTime <= level.bossAt + 42 ? 12 : 6;
    const total = scorePart + damagePart + speedPart;
    if (total >= 92) return "S";
    if (total >= 78) return "A";
    if (total >= 62) return "B";
    return "C";
  }

  function finishLevel() {
    const level = currentLevel();
    const levelScore = state.score - state.levelStartScore;
    const rating = calculateRating(levelScore, state.levelElapsed);
    state.ratings[state.levelIndex] = rating;
    const finalLevel = state.levelIndex === LEVELS.length - 1;
    state.running = false;
    state.levelComplete = true;
    state.campaignComplete = finalLevel;
    if (finalLevel) {
      unlockLevelSelect();
    }
    state.bossActive = false;
    state.boss = null;
    enemies.length = 0;
    enemyBullets.length = 0;
    lasers.length = 0;
    state.shake = 0.45;
    startButton.textContent = finalLevel ? "再玩一次" : "下一关";
    const title = finalLevel ? "全关通关" : `第 ${state.levelIndex + 1} 关完成`;
    const ratingText = finalLevel ? `总分 ${state.score} · 评分 ${state.ratings.join(" / ")} · 选关已解锁` : `评分 ${rating}`;
    showOverlay(
      level.name,
      title,
      `${ratingText} · 本关得分 ${levelScore} · 受伤 ${state.levelDamage} · 用时 ${formatTime(state.levelElapsed)}`,
    );
    stopMusic();
    sfx.victory();
    updateHud();
  }

  function updateGame(dt) {
    if (!state.running) return;
    const level = currentLevel();
    state.levelElapsed += dt;
    if (isEndless()) {
      state.difficulty = 1.85 + state.levelElapsed / 72 + state.endlessBossCount * 0.4;
    } else {
      state.difficulty = level.difficulty + Math.min(1.05, (state.levelElapsed / level.bossAt) * 0.68);
    }
    const shouldSpawnBoss = isEndless()
      ? !state.bossActive && state.levelElapsed >= state.endlessNextBossAt
      : !state.bossSpawned && state.levelElapsed >= level.bossAt;
    if (shouldSpawnBoss) {
      spawnBoss();
    }

    player.x += (player.targetX - player.x) * clamp(dt * 12, 0, 1);
    player.y += (player.targetY - player.y) * clamp(dt * 12, 0, 1);
    player.x = clamp(player.x, player.radius + 10, WORLD.width - player.radius - 10);
    player.y = clamp(player.y, 88, WORLD.height - player.radius - 18);
    player.invulnerable = Math.max(0, player.invulnerable - dt);

    trails.push({ x: player.x, y: player.y + 24, life: 0.26, maxLife: 0.26 });
    if (trails.length > 26) trails.shift();

    state.shotTimer -= dt;
    if (state.shotTimer <= 0) {
      state.shotTimer = Math.max(0.11, 0.18 - state.difficulty * 0.006);
      playerShoot();
    }

    state.enemyTimer -= dt;
    const enemyInterval = state.bossActive
      ? Math.max(0.5, 1.16 - state.difficulty * 0.13)
      : Math.max(0.14, 0.68 - state.difficulty * 0.125 - state.levelElapsed * 0.0055);
    if (state.enemyTimer <= 0) {
      state.enemyTimer = enemyInterval;
      spawnEnemy();
    }

    updateBoss(dt);
    updateArrays(dt);
    handleCollisions();
    updateHud();
  }

  function updateBoss(dt) {
    if (!state.boss) return;
    const boss = state.boss;
    const variant = boss.variant;
    if (boss.entry) {
      boss.y += 140 * dt;
      if (boss.y >= 92) {
        boss.y = 92;
        boss.entry = false;
      }
      return;
    }
    boss.phase += dt;
    if (variant.kind === "kite") {
      boss.x = WORLD.width * 0.5 + Math.sin(boss.phase * variant.speed) * 270;
      boss.y = 104 + Math.sin(boss.phase * variant.speed * 2) * 22;
    } else if (variant.kind === "crane") {
      boss.x = WORLD.width * 0.5 + Math.sin(boss.phase * variant.speed) * 245;
      boss.y = 104 + Math.cos(boss.phase * 1.35) * 24;
    } else if (variant.kind === "fan") {
      boss.x = WORLD.width * 0.5 + Math.sin(boss.phase * variant.speed) * 285;
      boss.y = 112 + Math.sin(boss.phase * variant.speed * 1.7) * 20;
    } else {
      boss.x += boss.direction * (variant.speed + state.difficulty * 10) * dt;
      const margin = variant.kind === "fortress" ? 170 : 130;
      if (boss.x < margin || boss.x > WORLD.width - margin) {
        boss.direction *= -1;
        boss.x = clamp(boss.x, margin, WORLD.width - margin);
      }
      const waveSpeed = variant.kind === "fortress" ? 760 : 520;
      const waveSize = variant.kind === "fortress" ? 8 : 12;
      boss.y = 94 + Math.sin(performance.now() / waveSpeed) * waveSize;
    }
    state.bossShotTimer -= dt;
    if (state.bossShotTimer <= 0) {
      state.bossShotTimer = Math.max(0.42, variant.shotInterval - state.difficulty * 0.082);
      bossShoot();
    }
  }

  function updateArrays(dt) {
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const item = bullets[i];
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.life -= dt;
      if (item.life <= 0 || item.y < -40) bullets.splice(i, 1);
    }

    for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
      const item = enemyBullets[i];
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.life -= dt;
      if (item.life <= 0 || item.x < -30 || item.x > WORLD.width + 30 || item.y > WORLD.height + 40) {
        enemyBullets.splice(i, 1);
      }
    }

    for (let i = lasers.length - 1; i >= 0; i -= 1) {
      lasers[i].life -= dt;
      if (lasers[i].life <= 0) lasers.splice(i, 1);
    }

    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const enemy = enemies[i];
      enemy.wave += dt * 2.6;
      enemy.x += (enemy.drift + Math.sin(enemy.wave) * 24) * dt;
      enemy.y += enemy.speed * dt;
      enemy.angle += Math.sin(enemy.wave) * dt * 0.9;
      if (enemy.y > WORLD.height + enemy.radius + 35) {
        enemies.splice(i, 1);
      }
    }

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy = p.vy * 0.98 + 70 * dt;
      p.angle += p.spin * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = floatText.length - 1; i >= 0; i -= 1) {
      const item = floatText[i];
      item.y -= 38 * dt;
      item.life -= dt;
      if (item.life <= 0) floatText.splice(i, 1);
    }

    for (let i = trails.length - 1; i >= 0; i -= 1) {
      trails[i].life -= dt;
      if (trails[i].life <= 0) trails.splice(i, 1);
    }

    state.shake = Math.max(0, state.shake - dt);
  }

  function handleCollisions() {
    for (let b = bullets.length - 1; b >= 0; b -= 1) {
      const bullet = bullets[b];
      let consumed = false;

      if (state.boss) {
        const bossHit = distance(bullet, state.boss) < state.boss.radius * 0.78 + bullet.radius;
        if (bossHit) {
          bullets.splice(b, 1);
          consumed = true;
          state.boss.hp -= 1;
          spawnBurst(bullet.x, bullet.y, COLORS.red, 4, 85);
          sfx.hit();
          if (state.boss.hp <= 0) defeatBoss();
        }
      }

      if (consumed) continue;

      for (let e = enemies.length - 1; e >= 0; e -= 1) {
        const enemy = enemies[e];
        if (distance(bullet, enemy) < bullet.radius + enemy.radius) {
          bullets.splice(b, 1);
          enemy.hp -= 1;
          spawnBurst(bullet.x, bullet.y, enemy.type === "ball" ? COLORS.blue : COLORS.red, 5, 100);
          sfx.hit();
          if (enemy.hp <= 0) {
            enemies.splice(e, 1);
            spawnBurst(enemy.x, enemy.y, enemy.type === "ball" ? COLORS.blue : COLORS.red, 12, 170);
            gainScore(enemy.score, enemy.x, enemy.y);
          }
          break;
        }
      }
    }

    for (let e = enemies.length - 1; e >= 0; e -= 1) {
      const enemy = enemies[e];
      if (distance(player, enemy) < player.radius + enemy.radius * 0.8) {
        enemies.splice(e, 1);
        spawnBurst(enemy.x, enemy.y, COLORS.red, 14, 180);
        damagePlayer();
      }
    }

    for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
      const bullet = enemyBullets[i];
      if (distance(player, bullet) < player.radius + bullet.radius) {
        enemyBullets.splice(i, 1);
        damagePlayer();
      }
    }

    for (let i = lasers.length - 1; i >= 0; i -= 1) {
      const laser = lasers[i];
      if (laser.life > laser.duration || laser.hit) continue;
      const start = { x: laser.x, y: laser.y };
      const end = {
        x: laser.x + Math.cos(laser.angle) * laser.length,
        y: laser.y + Math.sin(laser.angle) * laser.length,
      };
      if (distancePointToSegment(player, start, end) < player.radius + laser.width * 0.5) {
        laser.hit = true;
        damagePlayer();
      }
    }

    if (state.boss && distance(player, state.boss) < player.radius + state.boss.radius * 0.74) {
      damagePlayer();
    }
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    ctx.save();
    ctx.fillStyle = "rgba(255, 253, 250, 0.78)";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.strokeStyle = "rgba(56, 104, 168, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x < WORLD.width; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD.height);
      ctx.stroke();
    }
    for (let y = 0; y < WORLD.height; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function render() {
    clearCanvas();
    ctx.save();
    if (state.shake > 0) {
      ctx.translate(rand(-7, 7) * state.shake, rand(-7, 7) * state.shake);
    }
    drawTrails();
    enemies.forEach(drawEnemy);
    if (state.boss) drawBoss(state.boss);
    bullets.forEach(drawBullet);
    lasers.forEach(drawLaser);
    enemyBullets.forEach(drawEnemyBullet);
    drawPlayer();
    particles.forEach(drawParticle);
    floatText.forEach(drawFloatText);
    ctx.restore();
  }

  function drawPaperPlane(x, y, scale, angle, color, accent, lineWidth = 3) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = lineWidth;
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.moveTo(0, -44);
    ctx.lineTo(48, 34);
    ctx.lineTo(7, 18);
    ctx.lineTo(0, 48);
    ctx.lineTo(-7, 18);
    ctx.lineTo(-48, 34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(0, -39);
    ctx.lineTo(7, 18);
    ctx.lineTo(0, 48);
    ctx.lineTo(-7, 18);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(24, 32, 46, 0.45)";
    ctx.lineWidth = Math.max(1, lineWidth - 1);
    ctx.beginPath();
    ctx.moveTo(0, -38);
    ctx.lineTo(7, 18);
    ctx.moveTo(0, -38);
    ctx.lineTo(-7, 18);
    ctx.moveTo(-42, 31);
    ctx.lineTo(-7, 18);
    ctx.moveTo(42, 31);
    ctx.lineTo(7, 18);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlayer() {
    ctx.save();
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 16) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }
    const tilt = clamp((player.targetX - player.x) / 160, -0.36, 0.36);
    drawPaperPlane(player.x, player.y, 0.72, tilt, "#ffffff", "rgba(44, 127, 116, 0.42)", 3);
    ctx.restore();
  }

  function drawEnemy(enemy) {
    if (enemy.type === "ball") {
      drawPaperBall(enemy.x, enemy.y, enemy.radius, enemy.angle, enemy.creases);
      return;
    }
    drawPaperPlane(enemy.x, enemy.y, enemy.radius / 34, Math.PI + enemy.angle, "#fff7f0", "rgba(216, 69, 69, 0.42)", 3);
  }

  function drawPaperBall(x, y, radius, angle, creases) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = "#f7fbff";
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(56, 104, 168, 0.45)";
    ctx.lineWidth = 2;
    creases.forEach((crease) => {
      ctx.beginPath();
      ctx.moveTo(crease.x1 * radius, crease.y1 * radius);
      ctx.quadraticCurveTo(crease.cx * radius, crease.cy * radius, crease.x2 * radius, crease.y2 * radius);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawBoss(boss) {
    const variant = boss.variant;
    ctx.save();
    if (variant.kind === "kite") {
      drawKiteBoss(boss);
    } else if (variant.kind === "fortress") {
      drawFortressBoss(boss);
    } else if (variant.kind === "crane") {
      drawCraneBoss(boss);
    } else if (variant.kind === "fan") {
      drawFanBoss(boss);
    } else {
      drawPaperPlane(boss.x, boss.y, 1.42, Math.PI, variant.color, variant.accent, 3.5);
      ctx.strokeStyle = variant.bulletColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(boss.x - 64, boss.y + 4);
      ctx.lineTo(boss.x - 24, boss.y + 22);
      ctx.moveTo(boss.x + 64, boss.y + 4);
      ctx.lineTo(boss.x + 24, boss.y + 22);
      ctx.stroke();
    }
    ctx.fillStyle = COLORS.ink;
    ctx.font = "900 19px Trebuchet MS, Microsoft YaHei, Arial";
    ctx.textAlign = "center";
    ctx.fillText(variant.label, boss.x, boss.y - 18);
    ctx.restore();
  }

  function drawKiteBoss(boss) {
    const variant = boss.variant;
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.rotate(Math.sin(boss.phase * 1.8) * 0.1);
    ctx.fillStyle = variant.color;
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 3.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(0, -86);
    ctx.lineTo(92, -4);
    ctx.lineTo(0, 78);
    ctx.lineTo(-92, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = variant.accent;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -80);
    ctx.lineTo(88, -4);
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(24, 32, 46, 0.46)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -80);
    ctx.lineTo(0, 74);
    ctx.moveTo(-86, -3);
    ctx.lineTo(86, -3);
    ctx.moveTo(-52, 40);
    ctx.quadraticCurveTo(0, 18, 52, 40);
    ctx.stroke();
    ctx.restore();
  }

  function drawFortressBoss(boss) {
    const variant = boss.variant;
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.rotate(Math.sin(boss.phase * 1.2) * 0.035);
    ctx.lineJoin = "round";
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 3.5;
    ctx.fillStyle = variant.color;
    ctx.beginPath();
    ctx.moveTo(-104, -58);
    ctx.lineTo(104, -58);
    ctx.lineTo(88, 60);
    ctx.lineTo(-88, 60);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = variant.accent;
    ctx.globalAlpha = 0.62;
    ctx.beginPath();
    ctx.moveTo(-96, -48);
    ctx.lineTo(0, -16);
    ctx.lineTo(96, -48);
    ctx.lineTo(82, 49);
    ctx.lineTo(0, 24);
    ctx.lineTo(-82, 49);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(24, 32, 46, 0.45)";
    ctx.lineWidth = 2;
    [-58, -29, 0, 29, 58].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, -44);
      ctx.lineTo(x * 0.78, 48);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawCraneBoss(boss) {
    const variant = boss.variant;
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.rotate(Math.sin(boss.phase * 1.6) * 0.08);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.fillStyle = variant.color;
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, -78);
    ctx.lineTo(36, -18);
    ctx.lineTo(108, 6);
    ctx.lineTo(26, 22);
    ctx.lineTo(4, 76);
    ctx.lineTo(-18, 24);
    ctx.lineTo(-104, 6);
    ctx.lineTo(-34, -16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = variant.accent;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -70);
    ctx.lineTo(34, -16);
    ctx.lineTo(0, 4);
    ctx.lineTo(-34, -16);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = variant.bulletColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-68, 5);
    ctx.quadraticCurveTo(-28, -10, 0, 8);
    ctx.quadraticCurveTo(28, -10, 68, 5);
    ctx.stroke();
    ctx.restore();
  }

  function drawFanBoss(boss) {
    const variant = boss.variant;
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.rotate(boss.phase * 1.8);
    ctx.lineJoin = "round";
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i += 1) {
      ctx.rotate(Math.PI * 0.5);
      ctx.fillStyle = i % 2 === 0 ? variant.color : "#fffdf4";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(62, -42, 116, -10);
      ctx.quadraticCurveTo(70, 26, 16, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = variant.accent;
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawLaser(laser) {
    const active = laser.life <= laser.duration;
    const alpha = active ? 0.74 : 0.34;
    const endX = laser.x + Math.cos(laser.angle) * laser.length;
    const endY = laser.y + Math.sin(laser.angle) * laser.length;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = laser.color;
    ctx.lineCap = "round";
    ctx.lineWidth = active ? laser.width : 4;
    if (!active) ctx.setLineDash([14, 12]);
    ctx.beginPath();
    ctx.moveTo(laser.x, laser.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    if (active) {
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(3, laser.width * 0.32);
      ctx.beginPath();
      ctx.moveTo(laser.x, laser.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEnemyBullet(bullet) {
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(performance.now() / 180);
    ctx.fillStyle = "#fff3f0";
    ctx.strokeStyle = bullet.color || COLORS.red;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (bullet.shape === "diamond") {
      ctx.moveTo(0, -bullet.radius * 1.45);
      ctx.lineTo(bullet.radius * 1.45, 0);
      ctx.lineTo(0, bullet.radius * 1.45);
      ctx.lineTo(-bullet.radius * 1.45, 0);
      ctx.closePath();
    } else if (bullet.shape === "strip") {
      ctx.rect(-bullet.radius * 0.55, -bullet.radius * 1.65, bullet.radius * 1.1, bullet.radius * 3.3);
    } else {
      ctx.rect(-bullet.radius, -bullet.radius, bullet.radius * 2, bullet.radius * 2);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawBullet(bullet) {
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = COLORS.green;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, bullet.radius * 0.8, bullet.radius * 2.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawParticle(p) {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = "rgba(24, 32, 46, 0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.rect(-p.size * 0.5, -p.size * 0.35, p.size, p.size * 0.7);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawTrails() {
    trails.forEach((trail) => {
      const alpha = clamp(trail.life / trail.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha * 0.32;
      ctx.fillStyle = COLORS.blue;
      ctx.beginPath();
      ctx.ellipse(trail.x, trail.y, 12 * (1 - alpha + 0.4), 22 * (1 - alpha + 0.4), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawFloatText(item) {
    ctx.save();
    ctx.globalAlpha = clamp(item.life / item.maxLife, 0, 1);
    ctx.fillStyle = item.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.font = "900 24px Trebuchet MS, Microsoft YaHei, Arial";
    ctx.textAlign = "center";
    ctx.strokeText(item.text, item.x, item.y);
    ctx.fillText(item.text, item.x, item.y);
    ctx.restore();
  }

  function loop(timestamp) {
    const dt = Math.min(0.033, (timestamp - state.lastTime) / 1000 || 0);
    state.lastTime = timestamp;
    updateGame(dt);
    render();
    requestAnimationFrame(loop);
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);
    ctx.setTransform(canvas.width / WORLD.width, 0, 0, canvas.height / WORLD.height, 0, 0);
  }

  function updatePointer(event) {
    if (event.cancelable) event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WORLD.width;
    const y = ((event.clientY - rect.top) / rect.height) * WORLD.height;
    player.targetX = clamp(x, player.radius + 10, WORLD.width - player.radius - 10);
    player.targetY = clamp(y, 88, WORLD.height - player.radius - 18);
    state.mouseInside = true;
  }

  function handlePointerDown(event) {
    if (canvas.setPointerCapture && event.pointerId !== undefined) {
      canvas.setPointerCapture(event.pointerId);
    }
    updatePointer(event);
  }

  startButton.addEventListener("click", async () => {
    initAudio();
    if (audioCtx?.state === "suspended") {
      await audioCtx.resume();
    }
    if (!isEndless() && state.levelComplete && !state.campaignComplete) {
      startLevel(state.levelIndex + 1);
    } else {
      resetGame();
    }
  });

  modeButton.addEventListener("click", () => {
    state.mode = isEndless() ? "campaign" : "endless";
    hideLevelSelect();
    prepareModeScreen();
  });

  levelSelectButton.addEventListener("click", () => {
    showLevelSelect();
  });

  levelSelectClose.addEventListener("click", () => {
    hideLevelSelect();
  });

  levelButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.level);
      if (Number.isInteger(index) && index >= 0 && index < LEVELS.length) {
        startSelectedLevel(index);
      }
    });
  });

  soundButton.addEventListener("click", async () => {
    initAudio();
    if (!audioCtx) {
      muted = true;
      updateSoundButton();
      return;
    }
    if (audioCtx?.state === "suspended") {
      await audioCtx.resume();
    }
    muted = !muted;
    updateSoundButton();
    if (muted) {
      stopMusic();
      return;
    }
    if (!muted) {
      playTone({ frequency: 520, duration: 0.08, type: "triangle", volume: 0.14, slide: 90 });
      playNoise(0.05, 0.1, 2200);
      startMusic();
    }
  });

  canvas.addEventListener("pointerdown", handlePointerDown, { passive: false });
  canvas.addEventListener("pointermove", updatePointer, { passive: false });
  canvas.addEventListener("pointerup", () => {
    state.mouseInside = false;
  });
  canvas.addEventListener("pointercancel", () => {
    state.mouseInside = false;
  });
  canvas.addEventListener("pointerleave", () => {
    state.mouseInside = false;
  });

  window.addEventListener("resize", resizeCanvas);

  resizeCanvas();
  updateModeButton();
  updateLevelSelectButton();
  updateSoundButton();
  updateHud();
  showOverlay("Paper Flight", "纸飞机大战", "准备起飞");
  requestAnimationFrame(loop);
})();
