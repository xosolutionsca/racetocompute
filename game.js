// 💻 Computer Racing — Tiny lane racer for the browser
// No libraries. Runs on GitHub Pages.
// Player and AI are "computers" (monitors) racing to a finish line.
// Up/Down to change lane, Space to boost (battery drains).

(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const ui = {
    pos: document.getElementById("pos"),
    dist: document.getElementById("dist"),
    battery: document.getElementById("battery"),
    speed: document.getElementById("speed"),
    overlay: document.getElementById("overlay"),
  };

  // resize
  function resize() {
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = window.innerWidth; H = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  let W = window.innerWidth, H = window.innerHeight;
  resize();

  // Input
  const input = { up:false, down:false, boost:false, pause:false };
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") input.up = true;
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") input.down = true;
    if (e.key === " ") input.boost = true;
    if (e.key === "p" || e.key === "P") { input.pause = !input.pause; togglePause(input.pause); }
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") input.up = false;
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") input.down = false;
    if (e.key === " ") input.boost = false;
  });

  function togglePause(p) {
    ui.overlay.classList.toggle("hide", !p);
    if (p) ui.overlay.textContent = "Paused — press P to resume";
  }

  // Track & race
  const lanes = 5;
  const laneHeight = () => Math.min(120, Math.max(60, Math.floor(H / (lanes + 1))));
  const laneY = (i) => Math.floor((H - lanes * laneHeight()) / 2 + i * laneHeight() + laneHeight()/2);

  const FINISH = 2800; // distance to finish line in world units
  let cameraX = 0;

  // Entities
  function makeComputer(color, name, isPlayer=false, lane=2) {
    return {
      name, isPlayer,
      x: 0, // progress along track
      y: laneY(lane),
      lane,
      w: 70, h: 48,
      baseSpeed: isPlayer ? 240 : (200 + Math.random()*80),
      speed: 0,
      color,
      battery: 100,
      ai: {
        targetSpeed: 220 + Math.random()*120,
        laneChangeCooldown: 0,
      },
      finished: false,
      finishTime: Infinity,
    };
  }

  const racers = [
    makeComputer("#a8d8ff", "You", true, 2),
    makeComputer("#ffd8a8", "AI-1", false, 1),
    makeComputer("#d8ffa8", "AI-2", false, 3),
    makeComputer("#f8a8ff", "AI-3", false, 4),
  ];

  // Color pickups
  const features = []; // each: {color, x, lane}
  function addFeature(color, x, lane) { features.push({ color, x, lane }); }
  // sprinkle some
  const pickupColors = racers.map(r => r.color);
  for (let i=6; i<FINISH; i+=300) {
    const color = pickupColors[Math.floor(Math.random()*pickupColors.length)];
    addFeature(color, i + (Math.random()*120-60), Math.floor(Math.random()*lanes));
  }

  // Drawing helpers
  function drawTrack() {
    ctx.fillStyle = "#141820"; // track bg
    ctx.fillRect(0, 0, W, H);
    // lanes
    for (let i=0; i<lanes; i++) {
      const y = laneY(i);
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.setLineDash([16, 16]);
      ctx.beginPath();
      ctx.moveTo(-1000 - cameraX, y + laneHeight()/2);
      ctx.lineTo(FINISH + 1000 - cameraX, y + laneHeight()/2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // finish line
    const fx = FINISH - cameraX;
    ctx.fillStyle = "#ffffff";
    for (let i=0; i<10; i++) {
      ctx.fillRect(fx, i*laneHeight()/2, 18, laneHeight()/4 * (i%2?1:0.6));
    }
    ctx.fillText("FINISH", fx + 26, laneY(0) - laneHeight()/1.5);
  }

  function drawFeature(f) {
    const x = f.x - cameraX;
    const y = laneY(f.lane);
    if (x < -100 || x > W+100) return;
    ctx.fillStyle = f.color;
    ctx.fillRect(x-12, y-10, 24, 20);
  }

  function drawComputer(r) {
    const x = r.x - cameraX;
    const y = laneY(r.lane);
    // monitor
    ctx.fillStyle = r.color;
    ctx.fillRect(x - r.w/2, y - r.h/2, r.w, r.h);
    // screen bezel
    ctx.strokeStyle = "#1e1e1e";
    ctx.lineWidth = 3;
    ctx.strokeRect(x - r.w/2, y - r.h/2, r.w, r.h);
    // stand
    ctx.fillStyle = "#cfcfcf";
    ctx.fillRect(x - 10, y + r.h/2 - 2, 20, 10);
    ctx.fillRect(x - 26, y + r.h/2 + 8, 52, 8);
    // name
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.font = "12px sans-serif";
    ctx.fillText(r.name, x - r.w/2, y - r.h/2 - 6);
  }

  // Collisions with features
  function collideFeatures(r, dt) {
    for (const f of features) {
      if (f.lane !== r.lane) continue;
      if (Math.abs(r.x - f.x) < 30) {
        if (f.color === r.color) {
          r.speed = Math.max(80, r.speed - 120);
        } else {
          r.speed += 80;
          if (r.isPlayer) r.battery = Math.min(100, r.battery + 10);
        }
      }
    }
  }

  function updatePlayer(r, dt) {
    // lane change
    if (input.up && r.lane > 0) { r.lane--; input.up = false; }
    if (input.down && r.lane < lanes-1) { r.lane++; input.down = false; }

    // speed & boost
    const target = r.baseSpeed + (input.boost && r.battery > 0 ? 150 : 0);
    r.speed += (target - r.speed) * 6 * dt;
    if (input.boost && r.battery > 0) r.battery = Math.max(0, r.battery - 25*dt);
    else r.battery = Math.min(100, r.battery + 12*dt);

    // move
    r.x += r.speed * dt;
    collideFeatures(r, dt);
  }

  function updateAI(r, dt) {
    r.ai.laneChangeCooldown -= dt;
    // random desire to change lanes near pickups
    const ahead = features.find(f => f.lane === r.lane && f.x > r.x && f.x - r.x < 140);
    if (r.ai.laneChangeCooldown <= 0 && ahead && Math.random() < 0.5) {
      // try move away from matching color, toward different color
      let bestLane = r.lane;
      for (let dl of [-1,1]) {
        const L = r.lane + dl;
        if (L < 0 || L >= lanes) continue;
        const near = features.find(f => f.lane === L && Math.abs(f.x - r.x) < 160);
        if (ahead.color === r.color && (!near || near.color !== r.color)) bestLane = L;
        if (ahead.color !== r.color && near && near.color !== r.color) bestLane = L;
      }
      r.lane = bestLane;
      r.ai.laneChangeCooldown = 0.7 + Math.random()*0.9;
    }

    // choose speed
    const boostWish = Math.random() < 0.15;
    const target = Math.min(360, r.ai.targetSpeed + (boostWish ? 80 : 0));
    r.speed += (target - r.speed) * 4 * dt;
    r.x += r.speed * dt;
    collideFeatures(r, dt);
  }

  function standings() {
    const sorted = [...racers].sort((a,b)=> b.x - a.x);
    return sorted;
  }

  function updateUI(player) {
    const rank = standings().findIndex(r => r === player) + 1;
    ui.pos.textContent = `Position: ${rank}/${racers.length}`;
    const pct = Math.max(0, Math.min(100, Math.floor(player.x / FINISH * 100)));
    ui.dist.textContent = `Distance: ${pct}%`;
    ui.battery.textContent = `Battery: ${Math.floor(player.battery)}%`;
    ui.speed.textContent = `Speed: ${Math.floor(player.speed)}`;
  }

  function checkFinish(r, t) {
    if (!r.finished && r.x >= FINISH) {
      r.finished = true;
      r.finishTime = t;
    }
  }

  // Main loop
  let last = performance.now();
  let raceOver = false;
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (!input.pause && !raceOver) {
      for (const r of racers) {
        if (r.isPlayer) updatePlayer(r, dt);
        else updateAI(r, dt);
        checkFinish(r, now);
      }

      const player = racers[0]; // it's always the first we created
      // camera follows player with slight lead
      cameraX += ((player.x - W*0.3) - cameraX) * 3 * dt;

      // race over?
      if (racers.every(r => r.finished)) {
        raceOver = true;
        const sorted = standings();
        const playerRank = sorted.findIndex(r => r.isPlayer) + 1;
        ui.overlay.classList.remove("hide");
        ui.overlay.textContent = `Finish! You placed ${playerRank}/${racers.length}. Press R to race again.`;
      }
      updateUI(player);
    }

    // draw
    ctx.clearRect(0,0,W,H);
    drawTrack();
    for (const f of features) drawFeature(f);
    for (const r of standings().reverse()) drawComputer(r);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // restart
  window.addEventListener("keydown", (e) => {
    if ((e.key === "r" || e.key === "R")) {
      // reload page to reset state (simple for now)
      window.location.reload();
    }
  });
})();
