// Firebase Init
if (window.firebaseConfig) {
  firebase.initializeApp(window.firebaseConfig);
} else {
  console.error("Firebase configuration not found! Please ensure firebase-config.js is loaded correctly.");
}
const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

// ===== ONBOARDING & USER =====
const STEPS = 5;
let curStep = 0;
let stb_user = localStorage.getItem('stb_user') || 'İsimsiz';

function showStep(n) {
  for (let i = 0; i < STEPS; i++) {
    const stepEl = document.getElementById(`step-${i}`);
    const dotEl = document.getElementById(`dot-${i}`);
    if (stepEl) stepEl.classList.toggle('active', i === n);
    if (dotEl) dotEl.classList.toggle('active', i === n);
  }
  
  const prevBtn = document.getElementById('ob-prev');
  if (prevBtn) prevBtn.style.display = n === 0 ? 'none' : '';
  
  const nb = document.getElementById('ob-next');
  if (nb) {
    if (n === STEPS - 1) { 
      nb.textContent = '🎮 Oynayalım!'; 
      nb.className = 'btn btn-go'; 
    } else { 
      nb.textContent = 'İleri →'; 
      nb.className = 'btn btn-next'; 
    }
  }

  // Pre-fill username input if we are on that step
  if (n === 4) {
    const input = document.getElementById('username-input');
    if (input) input.value = stb_user !== 'İsimsiz' ? stb_user : '';
  }
}

function nextStep() {
  if (curStep === 4) {
    const input = document.getElementById('username-input');
    if (input && input.value.trim()) {
      stb_user = input.value.trim().substring(0, 12);
      localStorage.setItem('stb_user', stb_user);
    }
  }

  if (curStep < STEPS - 1) { 
    curStep++; 
    showStep(curStep); 
  } else {
    closeOnboard();
  }
}

function openNameEdit() {
  const overlay = document.getElementById('onboard');
  if (overlay) {
    curStep = 4;
    overlay.style.display = 'flex';
    overlay.classList.remove('out');
    showStep(4);
  }
}
function prevStep() {
  if (curStep > 0) { curStep--; showStep(curStep); }
}
function closeOnboard() {
  const el = document.getElementById('onboard');
  el.classList.add('out');
  setTimeout(() => el.style.display = 'none', 350);
}

// Swipe for onboarding
let tx = 0;
const onboardEl = document.getElementById('onboard');
if (onboardEl) {
  onboardEl.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, {passive:true});
  onboardEl.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) dx < 0 ? nextStep() : prevStep();
  }, {passive:true});
}

// ===== DICE DOTS =====
const DP = {1:[5],2:[3,7],3:[3,5,7],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
function setDie(p, v) {
  for (let i=1;i<=9;i++) {
    const dot = document.getElementById(`${p}-${i}`);
    if (dot) dot.className = 'dot'+(DP[v]?.includes(i)?' show':'');
  }
}

// ===== GAME =====
let state = {closed:[],selected:[],diceTotal:0,phase:'roll',bestScore:null};
const nums = [1,2,3,4,5,6,7,8,9];

function initGame() {
  state = {closed:[],selected:[],diceTotal:0,phase:'roll',bestScore:state.bestScore};
  const overlay = document.getElementById('win-overlay');
  if (overlay) overlay.classList.remove('active');
  const sumEl = document.getElementById('dice-sum');
  if (sumEl) sumEl.innerHTML = '<span>Zar</span>—';
  for (let i=1;i<=9;i++) { 
    const d1 = document.getElementById(`d1-${i}`);
    const d2 = document.getElementById(`d2-${i}`);
    if (d1) d1.className='dot'; 
    if (d2) d2.className='dot'; 
  }
  buildBoard(); updateUI(); setStatus('Zar at ve oynamaya başla!',''); setSelInfo(null);
}

function buildBoard() {
  const b = document.getElementById('board'); 
  if (!b) return;
  b.innerHTML = '';
  nums.forEach(n => {
    const t = document.createElement('div');
    t.className='tile'; t.id=`tile-${n}`; t.textContent=n; t.onclick=()=>toggleTile(n);
    b.appendChild(t);
  });
}

function rollDice() {
  if (state.phase !== 'roll') return;
  const d1=Math.floor(Math.random()*6)+1, d2=Math.floor(Math.random()*6)+1;
  state.diceTotal=d1+d2; state.selected=[];
  ['die1','die2'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.classList.add('rolling');
  });
  setTimeout(()=>{
    ['die1','die2'].forEach(id=>{
      const el = document.getElementById(id);
      if (el) el.classList.remove('rolling');
    });
    setDie('d1',d1); setDie('d2',d2);
  },480);
  const sumEl = document.getElementById('dice-sum');
  if (sumEl) sumEl.innerHTML=`<span>Zar</span>${state.diceTotal}`;
  state.phase='select'; updateTiles(); updateButtons(); setSelInfo([]);
  const rem = nums.filter(n=>!state.closed.includes(n));
  if (!canMove(rem,state.diceTotal)) { setTimeout(()=>gameOver(),700); return; }
  setStatus(`Toplamı ${state.diceTotal} yapan kutuları seç.`,'');
}

function toggleTile(n) {
  if (state.phase!=='select'||state.closed.includes(n)) return;
  const i=state.selected.indexOf(n);
  if (i>-1) state.selected.splice(i,1); else state.selected.push(n);
  updateTiles(); setSelInfo(state.selected);
}

function confirmMove() {
  if (state.phase!=='select') return;
  const sum=state.selected.reduce((a,b)=>a+b,0);
  if (!state.selected.length) { setStatus('Hiç kutu seçmedin.','error'); return; }
  if (sum!==state.diceTotal) { setStatus(`Toplam ${sum}, ama zar ${state.diceTotal}!`,'error'); return; }
  state.selected.forEach((n,i)=>{
    state.closed.push(n);
    const tile=document.getElementById(`tile-${n}`);
    if (tile) {
      setTimeout(()=>{
        tile.classList.add('close-anim');
        tile.addEventListener('animationend',()=>{ tile.classList.remove('close-anim'); tile.classList.add('closed'); tile.textContent=''; },{once:true});
      },i*80);
    }
  });
  const cnt=state.closed.length;
  state.selected=[]; state.diceTotal=0; state.phase='roll';
  updateScores(); updateButtons(); setSelInfo(null);
  const sumEl = document.getElementById('dice-sum');
  if (sumEl) sumEl.innerHTML='<span>Zar</span>—';
  if (cnt===9) { setTimeout(()=>winGame(),450); return; }
  setStatus('Güzel hamle! Tekrar zar at.','highlight');
}

function gameOver() {
  const score=nums.filter(n=>!state.closed.includes(n)).reduce((a,b)=>a+b,0);
  if (state.bestScore===null||score<state.bestScore) { 
    state.bestScore=score; 
    const bestEl = document.getElementById('score-best');
    if (bestEl) bestEl.textContent=score; 
  }
  const titleEl = document.getElementById('win-title');
  if (titleEl) titleEl.textContent='😔 Hamle Kalmadı';
  const msgEl = document.getElementById('win-msg');
  if (msgEl) msgEl.innerHTML=`Skorum: <strong style="color:var(--gold-bright)">${score}</strong> puan<br><span style="font-size:0.85rem;opacity:0.65">(düşük olan daha iyi)</span>`;
  const overlay = document.getElementById('win-overlay');
  if (overlay) overlay.classList.add('active');
  state.phase='gameover'; updateButtons();
  saveScoreToFirebase(score);
}

function winGame() {
  state.bestScore=0; 
  const bestEl = document.getElementById('score-best');
  if (bestEl) bestEl.textContent=0;
  const titleEl = document.getElementById('win-title');
  if (titleEl) titleEl.textContent='🎉 TEBRİKLER!';
  const msgEl = document.getElementById('win-msg');
  if (msgEl) msgEl.innerHTML='Tüm kutuları kapattın!<br><strong style="color:var(--gold-bright)">Mükemmel Skor: 0 🏆</strong>';
  const overlay = document.getElementById('win-overlay');
  if (overlay) overlay.classList.add('active');
  spawnConfetti(); state.phase='gameover'; updateButtons();
  saveScoreToFirebase(0);
}

// ===== FIREBASE LOGIC =====
async function saveScoreToFirebase(score) {
  try {
    await db.collection('scores').add({
      username: stb_user,
      score: score,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    fetchScoresFromFirebase();
  } catch (e) { console.error("Error saving score:", e); }
}

async function fetchScoresFromFirebase() {
  try {
    // Recent scores
    const recentSnap = await db.collection('scores')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();
    
    const recentList = document.getElementById('recent-list');
    if (recentList) {
      recentList.innerHTML = '';
      recentSnap.forEach(doc => {
        const data = doc.data();
        const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString('tr-TR', {day:'numeric', month:'short'}) : '-';
        const name = data.username || 'İsimsiz';
        recentList.innerHTML += `<li><span class="date">${date}</span><span class="user-name">${name}</span><span class="score-val">${data.score}</span></li>`;
      });
    }

    // Top scores (Lowest is best)
    const topSnap = await db.collection('scores')
      .orderBy('score', 'asc')
      .limit(5)
      .get();
    
    const topList = document.getElementById('top-list');
    if (topList) {
      topList.innerHTML = '';
      topSnap.forEach(doc => {
        const data = doc.data();
        const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString('tr-TR', {day:'numeric', month:'short'}) : '-';
        const name = data.username || 'İsimsiz';
        topList.innerHTML += `<li><span class="date">${date}</span><span class="user-name">${name}</span><span class="score-val">${data.score}</span></li>`;
      });
    }
  } catch (e) { console.error("Error fetching scores:", e); }
}

// Initial fetch
fetchScoresFromFirebase();

function canMove(arr,t) {
  for (let mask=1;mask<(1<<arr.length);mask++) {
    let s=0; for (let i=0;i<arr.length;i++) if (mask&(1<<i)) s+=arr[i];
    if (s===t) return true;
  }
  return false;
}

function updateTiles() {
  nums.forEach(n=>{
    const t=document.getElementById(`tile-${n}`); if (!t) return;
    t.classList.remove('selected','closed');
    if (state.closed.includes(n)) { t.classList.add('closed'); t.textContent=''; }
    else if (state.selected.includes(n)) { t.classList.add('selected'); t.textContent=n; }
    else t.textContent=n;
  });
}
function updateButtons() {
  const rollBtn = document.getElementById('roll-btn');
  const confirmBtn = document.getElementById('confirm-btn');
  if (rollBtn) {
    rollBtn.disabled = state.phase !== 'roll';
    rollBtn.classList.toggle('hidden', state.phase !== 'roll');
  }
  if (confirmBtn) {
    confirmBtn.disabled = state.phase !== 'select';
    confirmBtn.classList.toggle('hidden', state.phase !== 'select');
  }
}
function updateScores() {
  const s=nums.filter(n=>!state.closed.includes(n)).reduce((a,b)=>a+b,0);
  const remEl = document.getElementById('score-remaining');
  const closedEl = document.getElementById('score-closed');
  const bestEl = document.getElementById('score-best');
  if (remEl) remEl.textContent=s;
  if (closedEl) closedEl.textContent=`${state.closed.length}/9`;
  if (bestEl && state.bestScore!==null) bestEl.textContent=state.bestScore;
}
function setStatus(msg,cls) {
  const el=document.getElementById('status'); 
  if (el) {
    el.textContent=msg;
    el.className='status-msg'+(cls?' '+cls:'');
  }
}
function setSelInfo(sel) {
  const v=document.getElementById('sel-total'), m=document.getElementById('sel-match');
  if (!v || !m) return;
  if (sel===null||state.phase!=='select') { v.textContent='—'; m.className='sel-match empty'; m.textContent=''; return; }
  const sum=sel.reduce((a,b)=>a+b,0); v.textContent=sum||'—';
  if (!sel.length) { m.className='sel-match empty'; m.textContent=''; }
  else if (sum===state.diceTotal) { m.className='sel-match ok'; m.textContent='✓ Eşleşiyor'; }
  else { m.className='sel-match nok'; m.textContent=`${state.diceTotal-sum>0?'+':''}${state.diceTotal-sum} eksik`; }
}
function updateUI() { updateTiles(); updateButtons(); updateScores(); }

function spawnConfetti() {
  const ov=document.getElementById('win-overlay');
  if (!ov) return;
  const cols=['#d4a843','#f0c85a','#e74c3c','#2ecc71','#3498db','#f5edd6'];
  for (let i=0;i<40;i++) {
    const c=document.createElement('div'); c.className='confetti-piece';
    c.style.left=Math.random()*100+'%'; c.style.background=cols[Math.floor(Math.random()*cols.length)];
    c.style.setProperty('--drift',(Math.random()*80-40)+'px');
    c.style.animationDuration=(1.5+Math.random()*2)+'s'; c.style.animationDelay=(Math.random()*1.2)+'s';
    c.style.width=(6+Math.random()*8)+'px'; c.style.height=(6+Math.random()*8)+'px';
    ov.appendChild(c); setTimeout(()=>c.remove(),4000);
  }
}

// Global scope expose for onclick attributes
window.initGame = initGame;
window.rollDice = rollDice;
window.confirmMove = confirmMove;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.toggleTile = toggleTile;
window.closeOnboard = closeOnboard;

initGame();
