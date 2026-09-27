/* =========================================================
   Тягач Offroad / Offroad Truck / Օֆրոադ Բեռնատար
   3 языка + управление на телефоне (Three.js)
   ========================================================= */

// ---------- Переводы ----------
const I18N = {
  ru: {
    title: '🚛 Тягач Offroad',
    subtitle: 'Выберите прицеп и поезжайте по бездорожью',
    trailers: { none:'Без прицепа', flatbed:'Бортовой', tank:'Цистерна', container:'Контейнер' },
    start: 'Начать игру',
    controlsHint: 'W/↑ газ, S/↓ назад, A/D ← → поворот, Пробел — тормоз<br>На телефоне используйте кнопки внизу экрана<br>Прицеп можно сменить прямо во время игры',
    speedLabel: 'Скорость',
    trailerLabel: 'Прицеп',
    swapBtn: '🔁 Сменить прицеп',
    restartBtn: '↺ Заново',
    crashTitle: '💥 Опрокидывание!',
    crashText: 'Слишком резкий манёвр на бездорожье.',
    crashRestart: 'Начать заново',
    kmh: 'км/ч',
  },
  en: {
    title: '🚛 Offroad Truck',
    subtitle: 'Choose a trailer and drive off-road',
    trailers: { none:'No trailer', flatbed:'Flatbed', tank:'Tanker', container:'Container' },
    start: 'Start Game',
    controlsHint: 'W/↑ throttle, S/↓ reverse, A/D ← → turn, Space — brake<br>On mobile use the on-screen buttons<br>You can swap the trailer anytime during the game',
    speedLabel: 'Speed',
    trailerLabel: 'Trailer',
    swapBtn: '🔁 Swap trailer',
    restartBtn: '↺ Restart',
    crashTitle: '💥 Rollover!',
    crashText: 'Too sharp a maneuver off-road.',
    crashRestart: 'Restart',
    kmh: 'km/h',
  },
  hy: {
    title: '🚛 Օֆրոադ Բեռնատար',
    subtitle: 'Ընտրեք կցասայլը և վարեք անհարթ ճանապարհով',
    trailers: { none:'Առանց կցասայլի', flatbed:'Հարթակ', tank:'Ցիստեռն', container:'Կոնտեյներ' },
    start: 'Սկսել խաղը',
    controlsHint: 'W/↑ արագացում, S/↓ հետընթաց, A/D ← → շրջադարձ, Space — արգելակ<br>Հեռախոսում օգտագործեք էկրանի ներքևի կոճակները<br>Կցասայլը կարող եք փոխել խաղի ընթացքում',
    speedLabel: 'Արագություն',
    trailerLabel: 'Կցասայլ',
    swapBtn: '🔁 Փոխել կցասայլը',
    restartBtn: '↺ Սկսել նորից',
    crashTitle: '💥 Շրջվեց!',
    crashText: 'Չափազանց կտրուկ մանևր անհարթ ճանապարհին։',
    crashRestart: 'Սկսել նորից',
    kmh: 'կմ/ժ',
  },
};

const TRAILER_IDS = ['none','flatbed','tank','container'];
const TRAILER_ICONS = { none:'🚚', flatbed:'🪵', tank:'🛢️', container:'📦' };

function detectDefaultLang(){
  const nav = (navigator.language || 'ru').toLowerCase();
  if(nav.startsWith('hy')) return 'hy';
  if(nav.startsWith('en')) return 'en';
  return 'ru';
}

let currentLang = detectDefaultLang();
let chosenTrailer = 'flatbed';

// ---------- Применение перевода к интерфейсу ----------
function applyLanguage(lang){
  currentLang = lang;
  const t = I18N[lang];

  document.getElementById('panelTitle').textContent = t.title;
  document.getElementById('panelSubtitle').textContent = t.subtitle;
  document.getElementById('startBtn').textContent = t.start;
  document.getElementById('controlsHint').innerHTML = t.controlsHint;
  document.getElementById('speedLabel').textContent = t.speedLabel;
  document.getElementById('trailerLabel').textContent = t.trailerLabel;
  document.getElementById('kmhLabel').textContent = t.kmh;
  document.getElementById('swapBtn').textContent = t.swapBtn;
  document.getElementById('restartBtn').textContent = t.restartBtn;
  document.getElementById('crashTitle').textContent = t.crashTitle;
  document.getElementById('crashText').textContent = t.crashText;
  document.getElementById('crashRestart').textContent = t.crashRestart;

  document.querySelectorAll('.langBtn').forEach(b=>{
    b.classList.toggle('active', b.dataset.lang === lang);
  });

  renderTrailerPicker();

  if(trailerGroup !== undefined){
    const nameEl = document.getElementById('trailerVal');
    if(nameEl) nameEl.textContent = t.trailers[chosenTrailer];
  }
}

function renderTrailerPicker(){
  const t = I18N[currentLang];
  const picker = document.getElementById('trailerPicker');
  picker.innerHTML = '';
  TRAILER_IDS.forEach(id=>{
    const opt = document.createElement('div');
    opt.className = 'trailerOpt' + (id === chosenTrailer ? ' selected' : '');
    opt.innerHTML = `<span class="ico">${TRAILER_ICONS[id]}</span>${t.trailers[id]}`;
    opt.onclick = () => {
      chosenTrailer = id;
      document.querySelectorAll('.trailerOpt').forEach(o=>o.classList.remove('selected'));
      opt.classList.add('selected');
    };
    picker.appendChild(opt);
  });
}

document.querySelectorAll('.langBtn').forEach(btn=>{
  btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
});

document.getElementById('startBtn').onclick = startGame;
document.getElementById('restartBtn').onclick = () => resetGame();
document.getElementById('crashRestart').onclick = () => resetGame();
document.getElementById('swapBtn').onclick = () => cycleTrailer();

// ---------- THREE базовая настройка ----------
let scene, camera, renderer;
let truck, wheels = [];
let trailerGroup = null;
let trailerPivot = new THREE.Vector3(0,0,-6);
let trailerHeading = 0;
let keys = {};
let speed = 0;
let heading = 0;
let started = false;
let crashed = false;

const WORLD_HALF = 140;

function terrainHeight(x,z){
  return Math.sin(x*0.045)*1.8 + Math.cos(z*0.06)*1.6 + Math.sin((x+z)*0.09)*0.8;
}

function initScene(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fc6dd);
  scene.fog = new THREE.Fog(0x9fc6dd, 60, 230);

  camera = new THREE.PerspectiveCamera(65, window.innerWidth/window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x4a3c2a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.95);
  sun.position.set(70,100,50);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048);
  sun.shadow.camera.left=-140; sun.shadow.camera.right=140;
  sun.shadow.camera.top=140; sun.shadow.camera.bottom=-140;
  scene.add(sun);

  buildTerrain();
  buildScenery();

  window.addEventListener('resize', onResize);
  document.addEventListener('keydown', e=>keys[e.key.toLowerCase()]=true);
  document.addEventListener('keyup',   e=>keys[e.key.toLowerCase()]=false);
}

function onResize(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ---------- Бездорожье ----------
function buildTerrain(){
  const size = WORLD_HALF*2+40;
  const seg = 90;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI/2);
  const pos = geo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, terrainHeight(x,z));
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({ color: 0x6b5a3a, flatShading: true });
  const ground = new THREE.Mesh(geo, mat);
  ground.receiveShadow = true;
  scene.add(ground);

  for(let i=0;i<60;i++){
    const x = (Math.random()*2-1)*WORLD_HALF;
    const z = (Math.random()*2-1)*WORLD_HALF;
    const patch = new THREE.Mesh(
      new THREE.CircleGeometry(3+Math.random()*4,10),
      new THREE.MeshStandardMaterial({ color: 0x4d7a3a })
    );
    patch.rotation.x = -Math.PI/2;
    patch.position.set(x, terrainHeight(x,z)+0.03, z);
    scene.add(patch);
  }
}

function buildScenery(){
  for(let i=0;i<45;i++){
    const x = (Math.random()*2-1)*WORLD_HALF;
    const z = (Math.random()*2-1)*WORLD_HALF;
    const y = terrainHeight(x,z);
    if(Math.random() > 0.5){
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.25,2,6), new THREE.MeshStandardMaterial({ color: 0x5a3d24 }));
      trunk.position.set(x, y+1, z);
      trunk.castShadow = true;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(1.3,2.6,8), new THREE.MeshStandardMaterial({ color: 0x2e6b34 }));
      crown.position.set(x, y+3, z);
      crown.castShadow = true;
      scene.add(trunk); scene.add(crown);
    } else {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6+Math.random()*0.7,0), new THREE.MeshStandardMaterial({ color: 0x8a8a8a, flatShading: true }));
      rock.position.set(x, y+0.4, z);
      rock.rotation.set(Math.random(),Math.random(),Math.random());
      rock.castShadow = true;
      scene.add(rock);
    }
  }
}

// ---------- Тягач ----------
function buildTruck(){
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2255aa, metalness: 0.4, roughness: 0.4 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdadada, metalness: 0.9, roughness: 0.2 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1b2733 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4,2.0,2.4), bodyMat);
  cabin.position.set(0,1.6,1.6);
  cabin.castShadow = true;
  g.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.3,0.4,1.2), bodyMat);
  roof.position.set(0,2.75,1.9);
  g.add(roof);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.2,1.2,1.6), bodyMat);
  hood.position.set(0,1.0,3.4);
  g.add(hood);

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0,0.5,2.6), blackMat);
  chassis.position.set(0,0.6,-0.3);
  g.add(chassis);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.8,0.9,0.1), chromeMat);
  grille.position.set(0,1.1,4.2);
  g.add(grille);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.1,1.1,0.1), glassMat);
  windshield.position.set(0,1.9,2.75);
  windshield.rotation.x = -0.3;
  g.add(windshield);

  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,2.2,8), chromeMat);
  pipe.position.set(1.15,1.6,0.8);
  g.add(pipe);

  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffaa, emissiveIntensity: 1 });
  [-0.85,0.85].forEach(x=>{
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.15,10,10), lightMat);
    hl.position.set(x,1.0,4.25);
    g.add(hl);
  });

  const wheelGeo = new THREE.CylinderGeometry(0.65,0.65,0.5,16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x161616 });
  const wheelPos = [
    [-1.2,0.65,3.2],[1.2,0.65,3.2],
    [-1.2,0.65,-0.6],[1.2,0.65,-0.6],
    [-1.2,0.65,-1.5],[1.2,0.65,-1.5],
  ];
  wheels = [];
  wheelPos.forEach(p=>{
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI/2;
    w.position.set(p[0],p[1],p[2]);
    w.castShadow = true;
    g.add(w);
    wheels.push(w);
  });

  return g;
}

// ---------- Прицепы ----------
function buildTrailer(type){
  if(type === 'none') return null;
  const g = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const wheelGeo = new THREE.CylinderGeometry(0.55,0.55,0.4,14);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x151515 });

  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.0,0.25,5.5), frameMat);
  frame.position.set(0,0.55,-3.2);
  frame.castShadow = true;
  g.add(frame);

  if(type === 'flatbed'){
    const platform = new THREE.Mesh(new THREE.BoxGeometry(2.2,0.15,5.5), new THREE.MeshStandardMaterial({ color: 0x8a6a45 }));
    platform.position.set(0,0.7,-3.2);
    g.add(platform);
    for(let i=0;i<3;i++){
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,2.0,10), new THREE.MeshStandardMaterial({ color: 0x6b4a2a }));
      log.rotation.z = Math.PI/2;
      log.position.set(-0.5+i*0.5, 1.0, -3.2 + (i-1)*0.1);
      g.add(log);
    }
  } else if(type === 'tank'){
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,5.2,16), new THREE.MeshStandardMaterial({ color: 0xc0c4c8, metalness: 0.6, roughness: 0.3 }));
    tank.rotation.z = Math.PI/2;
    tank.position.set(0,1.4,-3.2);
    tank.castShadow = true;
    g.add(tank);
  } else if(type === 'container'){
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.3,2.3,5.4), new THREE.MeshStandardMaterial({ color: 0xb5451e }));
    box.position.set(0,1.85,-3.2);
    box.castShadow = true;
    g.add(box);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.32,0.3,5.42), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    stripe.position.set(0,1.85,-3.2);
    g.add(stripe);
  }

  [[-1.15,0.55,-5.0],[1.15,0.55,-5.0],[-1.15,0.55,-5.8],[1.15,0.55,-5.8]].forEach(p=>{
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI/2;
    w.position.set(p[0],p[1],p[2]);
    w.castShadow = true;
    g.add(w);
  });

  return g;
}

function setTrailer(type){
  if(trailerGroup){ scene.remove(trailerGroup); trailerGroup = null; }
  chosenTrailer = type;
  const built = buildTrailer(type);
  if(built){
    trailerGroup = built;
    scene.add(trailerGroup);
  }
  document.getElementById('trailerVal').textContent = I18N[currentLang].trailers[type];
}

function cycleTrailer(){
  const idx = TRAILER_IDS.indexOf(chosenTrailer);
  const next = TRAILER_IDS[(idx+1) % TRAILER_IDS.length];
  setTrailer(next);
}

// ---------- Игровой цикл ----------
let lastTime = 0;
function animate(time){
  if(!started) return;
  requestAnimationFrame(animate);
  const dt = Math.min((time-lastTime)/1000, 0.05) || 0;
  lastTime = time;

  if(!crashed){
    handleControls(dt);
    updateTrailer(dt);
    checkCrash();
    updateCamera();
  }
  renderer.render(scene, camera);
}

function handleControls(dt){
  const accel = 7, maxSpeed = 18, maxRevSpeed = -6, friction = 3.5, turnSpeed = 1.3;

  if(keys['w'] || keys['arrowup']) speed += accel*dt;
  else if(keys['s'] || keys['arrowdown']) speed -= accel*dt;
  else {
    if(speed > 0) speed = Math.max(0, speed - friction*dt);
    if(speed < 0) speed = Math.min(0, speed + friction*dt);
  }
  if(keys[' ']) speed *= (1 - Math.min(1, 6*dt));

  speed = Math.max(maxRevSpeed, Math.min(maxSpeed, speed));

  const turnFactor = Math.max(-1,Math.min(1, speed/6));
  if(keys['a'] || keys['arrowleft'])  heading += turnSpeed*dt*turnFactor;
  if(keys['d'] || keys['arrowright']) heading -= turnSpeed*dt*turnFactor;

  truck.rotation.y = heading;
  truck.position.x += Math.sin(heading)*speed*dt;
  truck.position.z += Math.cos(heading)*speed*dt;

  truck.position.x = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, truck.position.x));
  truck.position.z = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, truck.position.z));

  truck.position.y = terrainHeight(truck.position.x, truck.position.z);

  wheels.forEach(w=> w.rotation.x -= speed*dt*1.4);

  document.getElementById('speedVal').textContent = Math.abs(Math.round(speed*10));
}

function updateTrailer(dt){
  if(!trailerGroup) return;
  const hitchDist = 3.0;
  const hitchX = truck.position.x - Math.sin(heading)*hitchDist;
  const hitchZ = truck.position.z - Math.cos(heading)*hitchDist;

  const dx = hitchX - trailerPivot.x;
  const dz = hitchZ - trailerPivot.z;
  const dist = Math.sqrt(dx*dx+dz*dz);

  if(dist > 0.001){
    const dirX = dx/dist, dirZ = dz/dist;
    trailerPivot.x += dirX*dist;
    trailerPivot.z += dirZ*dist;
    trailerHeading = Math.atan2(dirX, dirZ);
  }
  trailerPivot.y = terrainHeight(trailerPivot.x, trailerPivot.z);

  trailerGroup.position.set(trailerPivot.x, trailerPivot.y, trailerPivot.z);
  trailerGroup.rotation.y = trailerHeading;
}

function updateCamera(){
  const distBack = 10, height = 5;
  const targetPos = new THREE.Vector3(
    truck.position.x - Math.sin(heading)*distBack,
    truck.position.y + height,
    truck.position.z - Math.cos(heading)*distBack
  );
  camera.position.lerp(targetPos, 0.1);
  const lookAt = new THREE.Vector3(truck.position.x, truck.position.y+1.5, truck.position.z);
  camera.lookAt(lookAt);
}

function checkCrash(){
  if(Math.abs(speed) > 12 && (keys['a']||keys['arrowleft']||keys['d']||keys['arrowright'])){
    if(Math.random() < 0.0025) triggerCrash();
  }
}

function triggerCrash(){
  crashed = true;
  document.getElementById('crashOverlay').classList.remove('hidden');
}

// ---------- Запуск / рестарт ----------
function startGame(){
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('topRightBtns').classList.remove('hidden');
  if(isTouchDevice()) document.getElementById('mobileControls').classList.remove('hidden');

  if(!scene) initScene();
  placeTruck();
  setTrailer(chosenTrailer);

  started = true;
  crashed = false;
  lastTime = performance.now();
  requestAnimationFrame(animate);
}

function placeTruck(){
  if(truck) scene.remove(truck);
  truck = buildTruck();
  truck.position.set(0, terrainHeight(0,10), 10);
  heading = 0;
  speed = 0;
  trailerPivot.set(0, 0, 10-3.0-3.0);
  trailerHeading = 0;
  scene.add(truck);
}

function resetGame(){
  document.getElementById('crashOverlay').classList.add('hidden');
  crashed = false;
  placeTruck();
  setTrailer(chosenTrailer);
  lastTime = performance.now();
}

// ---------- Мобильное управление ----------
function isTouchDevice(){
  return ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || window.innerWidth < 820;
}

function bindHoldButton(el, key){
  const press = (e)=>{ e.preventDefault(); keys[key] = true; };
  const release = (e)=>{ e.preventDefault(); keys[key] = false; };
  el.addEventListener('touchstart', press, { passive:false });
  el.addEventListener('touchend', release, { passive:false });
  el.addEventListener('touchcancel', release, { passive:false });
  el.addEventListener('mousedown', press);
  el.addEventListener('mouseup', release);
  el.addEventListener('mouseleave', release);
}

bindHoldButton(document.getElementById('btnGas'), 'w');
bindHoldButton(document.getElementById('btnBrake'), 's');
bindHoldButton(document.getElementById('btnLeft'), 'a');
bindHoldButton(document.getElementById('btnRight'), 'd');

// ---------- Инициализация UI ----------
applyLanguage(currentLang);
