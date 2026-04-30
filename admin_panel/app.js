import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, deleteDoc, updateDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDIYz3jWy0W8dO0HzhBa-2MQyq6nfb2AcU",
    authDomain: "kaeru-jet10-app.firebaseapp.com",
    projectId: "kaeru-jet10-app",
    storageBucket: "kaeru-jet10-app.firebasestorage.app",
    messagingSenderId: "743245476829",
    appId: "1:743245476829:web:ba8a4af6e8c696e9793c34"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const sectionList = document.getElementById('section-list');
const sectionAdd = document.getElementById('section-add');
const navList = document.getElementById('nav-list');
const navAdd = document.getElementById('nav-add');
const navUsers = document.getElementById('nav-users'); // New
const gamesList = document.getElementById('games-list');
const usersList = document.getElementById('users-list'); // New
const gameCountSpan = document.getElementById('game-count');
const userCountSpan = document.getElementById('user-count'); // New
const sectionUsers = document.getElementById('section-users'); // New
const toastEl = document.getElementById('toast');
const addForm = document.getElementById('add-game-form');
const btnAdd = document.getElementById('add-game-btn');

// Edit Modal Elements
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-game-form');
const btnCloseModal = document.getElementById('close-modal-btn');
const btnEditSave = document.getElementById('edit-game-btn');

// Navigation Logic
navList.addEventListener('click', () => {
    navList.classList.add('active'); navAdd.classList.remove('active');
    sectionList.classList.remove('hidden'); sectionAdd.classList.add('hidden');
    window.scrollTo(0, 0);
});
navAdd.addEventListener('click', () => {
    navAdd.classList.add('active'); navList.classList.remove('active'); navUsers.classList.remove('active');
    sectionAdd.classList.remove('hidden'); sectionList.classList.add('hidden'); sectionUsers.classList.add('hidden');
    window.scrollTo(0, 0);
});
navUsers.addEventListener('click', () => {
    navUsers.classList.add('active'); navList.classList.remove('active'); navAdd.classList.remove('active');
    sectionUsers.classList.remove('hidden'); sectionList.classList.add('hidden'); sectionAdd.classList.add('hidden');
    window.scrollTo(0, 0);
});

// Toast Helper
function showToast(message, isError = false) {
    toastEl.textContent = message;
    if (isError) toastEl.classList.add('error');
    else toastEl.classList.remove('error');
    toastEl.classList.add('show');
    setTimeout(() => { toastEl.classList.remove('show'); }, 3000);
}

// Add Game
addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('game-name').value;
    const url = document.getElementById('game-url').value;
    const imageUrl = document.getElementById('game-image').value;
    const cost = parseInt(document.getElementById('game-cost').value, 10) || 0;
    
    btnAdd.disabled = true; btnAdd.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    try {
        await addDoc(collection(db, "oyunlar"), {
            name, url, cost, imageUrl: imageUrl || null, createdAt: serverTimestamp()
        });
        addForm.reset();
        showToast("Game Added!");
        navList.click();
    } catch (error) {
        console.error(error); showToast("Error adding game.", true);
    } finally {
        btnAdd.disabled = false; btnAdd.innerHTML = `<span>Add Game</span>`;
    }
});

// Edit Modal Helpers
btnCloseModal.addEventListener('click', () => {
    editModal.classList.add('hidden');
});
// Also close modal if clicked outside
editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
        editModal.classList.add('hidden');
    }
});

// Edit Game Submit
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-game-id').value;
    const name = document.getElementById('edit-game-name').value;
    const url = document.getElementById('edit-game-url').value;
    const imageUrl = document.getElementById('edit-game-image').value;
    const cost = parseInt(document.getElementById('edit-game-cost').value, 10) || 0;

    btnEditSave.disabled = true; btnEditSave.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    try {
        await updateDoc(doc(db, "oyunlar", id), {
            name, url, cost, imageUrl: imageUrl || null
        });
        editModal.classList.add('hidden');
        showToast("Game Updated!");
    } catch(err) {
        console.error(err); showToast("Update Failed.", true);
    } finally {
        btnEditSave.disabled = false; btnEditSave.innerHTML = `<span>Update Game</span>`;
    }
});

// Realtime Games List
const q = query(collection(db, "oyunlar"), orderBy("createdAt", "desc"));
let gamesData = {}; // Store local cache for edit

onSnapshot(q, (snapshot) => {
    gameCountSpan.textContent = snapshot.docs.length;
    gamesList.innerHTML = '';
    gamesData = {}; // clear
    if (snapshot.empty) {
        gamesList.innerHTML = `<div style="text-align:center; padding: 40px; color: #888;">No games yet.</div>`;
        return;
    }

    snapshot.forEach((docSnap) => {
        const game = docSnap.data();
        const id = docSnap.id;
        gamesData[id] = game;
        
        let iconHtml = game.imageUrl 
            ? `<div class="game-icon" style="background-image: url('${game.imageUrl}')"></div>`
            : `<div class="game-icon"><i class="fa-solid fa-gamepad"></i></div>`;

        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div class="game-info">
                ${iconHtml}
                <div class="game-details">
                    <span class="game-name">${game.name}</span>
                    <span class="game-link">${game.url}</span>
                    <span class="game-cost" style="color: #4ade80; font-size: 0.85rem; display: block; margin-top: 4px;"><i class="fa-solid fa-coins"></i> ${game.cost !== undefined ? game.cost : 0} Cost</span>
                </div>
            </div>
            <div class="card-actions">
                <button class="action-btn edit" data-id="${id}"><i class="fa-solid fa-pen"></i> Edit</button>
                <button class="action-btn delete" data-id="${id}"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        gamesList.appendChild(card);
    });

    // Attach Listeners to dynamic buttons
    document.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if(confirm("Delete this game?")) {
                const btnIcon = btn.querySelector('i');
                btnIcon.className = 'fa-solid fa-spinner fa-spin';
                try {
                    await deleteDoc(doc(db, "oyunlar", btn.getAttribute('data-id')));
                    showToast("Game Deleted");
                } catch(err) {
                    btnIcon.className = 'fa-solid fa-trash';
                    showToast("Delete Failed", true);
                }
            }
        });
    });

    document.querySelectorAll('.action-btn.edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const g = gamesData[id];
            if(g) {
                document.getElementById('edit-game-id').value = id;
                document.getElementById('edit-game-name').value = g.name;
                document.getElementById('edit-game-url').value = g.url;
                document.getElementById('edit-game-cost').value = g.cost !== undefined ? g.cost : 0;
                document.getElementById('edit-game-image').value = g.imageUrl || '';
                editModal.classList.remove('hidden');
            }
        });
    });
}, (error) => {
    gamesList.innerHTML = `<div style="text-align:center;color:red;">Error loading data. Check Firestore rules.</div>`;
});

// Realtime Users & Tokens List
const usersQuery = query(collection(db, "users"), orderBy("last_token_update", "desc"));

onSnapshot(usersQuery, (snapshot) => {
    if (userCountSpan) userCountSpan.textContent = snapshot.docs.length;
    if (!usersList) return;
    
    usersList.innerHTML = '';
    if (snapshot.empty) {
        usersList.innerHTML = `<div style="text-align:center; padding: 40px; color: #888;">No users registered for notifications yet.</div>`;
        return;
    }

    snapshot.forEach((docSnap) => {
        const user = docSnap.data();
        const id = docSnap.id;
        const lastSeen = user.last_token_update?.toDate().toLocaleDateString() || 'N/A';
        
        const card = document.createElement('div');
        card.className = 'game-card'; // Reuse same styling
        card.innerHTML = `
            <div class="game-info">
                <div class="game-icon"><i class="fa-solid fa-mobile-screen"></i></div>
                <div class="game-details">
                    <span class="game-name">${id.substring(0, 8)}... (Device)</span>
                    <span class="game-link" style="word-break: break-all; font-size: 0.75rem;">Token: ${user.fcm_token ? user.fcm_token.substring(0, 20) + '...' : 'No Token'}</span>
                    <span class="game-cost" style="color: #888; font-size: 0.75rem;">Last Active: ${lastSeen}</span>
                </div>
            </div>
            <div class="card-actions">
                <button class="action-btn copy-token" data-token="${user.fcm_token || ''}"><i class="fa-solid fa-copy"></i> Copy</button>
            </div>
        `;
        usersList.appendChild(card);
    });

    // Copy Listener
    document.querySelectorAll('.copy-token').forEach(btn => {
        btn.addEventListener('click', () => {
            const token = btn.getAttribute('data-token');
            if (token) {
                navigator.clipboard.writeText(token);
                showToast("Token Copied!");
            } else {
                showToast("No Token Available", true);
            }
        });
    });
}, (error) => {
    console.error("Users load error: ", error);
});
