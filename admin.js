const firebaseConfig = {
  apiKey: "AIzaSyCrLvgdWkuReyFd9Benp0xVpsUNtsN7Uno",
  authDomain: "ramdev-feedback-clean.firebaseapp.com",
  databaseURL: "https://ramdev-feedback-clean-default-rtdb.firebaseio.com",
  projectId: "ramdev-feedback-clean",
  storageBucket: "ramdev-feedback-clean.firebasestorage.app",
  messagingSenderId: "110768334786",
  appId: "1:110768334786:web:5f9280b820ac552216985b"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database().ref('feedbacks');

const allowedAdmins = [
  'ritikbhalwala1@gmail.com',
  'malvifenil0@gmail.com'
];

// Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const emailInput = document.getElementById('admin-email');
const passInput = document.getElementById('admin-password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const loggedEmail = document.getElementById('logged-email');
const totalReviews = document.getElementById('total-reviews');
const averageRating = document.getElementById('average-rating');
const feedbackList = document.getElementById('feedback-list');
const exportBtn = document.getElementById('export-btn');
const deleteAllBtn = document.getElementById('delete-all-btn');

// Login
loginBtn.addEventListener('click', () => {
  const email = emailInput.value.trim();
  const password = passInput.value.trim();
  loginError.textContent = '';
  if (!email || !password) {
    loginError.textContent = 'Please enter email and password.';
    return;
  }
  auth.signInWithEmailAndPassword(email, password)
    .then(cred => {
      if (!allowedAdmins.includes(cred.user.email)) {
        auth.signOut();
        loginError.textContent = 'Unauthorized access.';
        return;
      }
      showDashboard(cred.user.email);
    })
    .catch(err => loginError.textContent = err.message);
});

// Show Dashboard
function showDashboard(email) {
  loginScreen.classList.add('hidden');
  dashboardScreen.classList.remove('hidden');
  loggedEmail.textContent = email;
  loadStats();
  loadFeedbacks();
}

logoutBtn.addEventListener('click', () => auth.signOut().then(() => location.reload()));

// Load stats
function loadStats() {
  db.once('value').then(snap => {
    const data = snap.val() || {};
    const users = Object.values(data);
    const total = users.length;
    const sum = users.reduce((acc, u) => acc + (u.reviews?.[0]?.rating || 0), 0);
    totalReviews.textContent = total;
    averageRating.textContent = total ? (sum/total).toFixed(1) : '0.0';
  });
}

// Load feedbacks
function loadFeedbacks() {
  feedbackList.innerHTML = '';
  db.once('value').then(snap => {
    const data = snap.val() || {};
    Object.entries(data).forEach(([uid, user]) => {
      const latest = user.reviews?.sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
      const div = document.createElement('div');
      div.className = 'feedback-card';
      div.innerHTML = `
        <p><strong>${user.name}</strong> (${latest.rating}⭐)</p>
        <p>${latest.message}</p>
        ${latest.imageUrl? `<img src="${latest.imageUrl}" class="thumb"/>`: ''}
        <button onclick="deleteFeedback('${uid}')">Delete</button>
      `;
      feedbackList.appendChild(div);
    });
  });
}

function deleteFeedback(uid) {
  if (!confirm('Delete feedback for ' + uid + '?')) return;
  db.child(uid).remove().then(loadFeedbacks).then(loadStats);
}

// Export CSV
exportBtn.addEventListener('click', () => {
  db.once('value').then(snap => {
    const data = snap.val() || {};
    let csv = 'Name,Email,Message,Rating,Date\n';
    Object.values(data).forEach(u => {
      u.reviews.forEach(r => {
        csv += `"${u.name}","${u.email}","${r.message.replace(/"/g, "'")}","${r.rating}","${r.date}"\n`;
      });
    });
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'feedbacks.csv';
    a.click();
  });
});

// Delete all
deleteAllBtn.addEventListener('click', () => {
  if (!confirm('Delete ALL feedback?')) return;
  db.remove().then(loadFeedbacks).then(loadStats);
});