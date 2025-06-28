// ✅ Firebase Config (already shared)
const firebaseConfig = {
  apiKey: "AIzaSyCUyWy3A6FV4NwobM5abPoZ06kn2cQw-9c",
  authDomain: "fast-food-feedback.firebaseapp.com",
  databaseURL: "https://fast-food-feedback-default-rtdb.firebaseio.com",
  projectId: "fast-food-feedback",
  storageBucket: "fast-food-feedback.appspot.com",
  messagingSenderId: "347264169976",
  appId: "1:347264169976:web:14a7012e792b2582a90145"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

const allowedAdmins = [
  "ritikbhalwala1@gmail.com",
  "malvifenil0@gmail.com" // ⬅️ Change to second admin email
];

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const loginSection = document.getElementById("login-section");
const adminSection = document.getElementById("admin-section");
const adminEmail = document.getElementById("admin-email");
const feedbackList = document.getElementById("feedback-list");
const exportBtn = document.getElementById("export-btn");
const deleteAllBtn = document.getElementById("delete-all-btn");
const totalReviews = document.getElementById("total-reviews");
const averageRating = document.getElementById("average-rating");

loginBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
};

logoutBtn.onclick = () => {
  auth.signOut();
  location.reload();
};

auth.onAuthStateChanged(user => {
  if (user) {
    if (!allowedAdmins.includes(user.email)) {
      alert("❌ Access Denied");
      auth.signOut();
      return;
    }
    loginSection.style.display = "none";
    adminSection.classList.remove("hidden");
    adminEmail.innerText = `Logged in as: ${user.email}`;
    fetchFeedbacks();
  }
});

function fetchFeedbacks() {
  db.ref("feedbacks").once("value", snapshot => {
    const data = snapshot.val();
    feedbackList.innerHTML = "";
    let total = 0;
    let ratingSum = 0;

    for (let key in data) {
      const fb = data[key];
      total++;
      ratingSum += Number(fb.rating || 0);

      const card = document.createElement("div");
      card.className = "feedback-card";
      card.innerHTML = `
        <p><strong>${fb.name}</strong> (${fb.rating}⭐)</p>
        <p>${fb.message}</p>
        ${fb.imageUrl ? `<img src="${fb.imageUrl}" class="thumb" />` : ""}
        <button onclick="deleteFeedback('${key}')">Delete</button>
      `;
      feedbackList.appendChild(card);
    }

    totalReviews.innerText = total;
    averageRating.innerText = total > 0 ? (ratingSum / total).toFixed(1) : "0";
  });
}

function deleteFeedback(key) {
  if (confirm("Delete this feedback?")) {
    db.ref("feedbacks/" + key).remove().then(() => {
      fetchFeedbacks();
    });
  }
}

deleteAllBtn.onclick = () => {
  if (confirm("⚠️ Delete ALL feedbacks? This cannot be undone!")) {
    db.ref("feedbacks").remove().then(() => {
      fetchFeedbacks();
    });
  }
};

exportBtn.onclick = () => {
  db.ref("feedbacks").once("value", snapshot => {
    const data = snapshot.val();
    if (!data) return alert("No data to export.");
    let csv = "Name,Email,Message,Rating,Time\n";
    for (let key in data) {
      const fb = data[key];
      csv += `"${fb.name}","${fb.email || ""}","${fb.message.replace(/"/g, "'")}","${fb.rating}","${fb.time || ""}"\n`;
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "feedbacks.csv";
    a.click();
  });
};
