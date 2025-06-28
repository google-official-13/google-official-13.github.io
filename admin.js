// Firebase Config
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
  "malvifenil0@gmail.com"
];

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const changePassBtn = document.getElementById("change-password-btn");
const emailInput = document.getElementById("admin-email-input");
const passInput = document.getElementById("admin-password-input");
const loginSection = document.getElementById("login-section");
const dashboard = document.getElementById("dashboard-section");
const loginError = document.getElementById("login-error");
const loggedEmail = document.getElementById("logged-email");

loginBtn.onclick = () => {
  const email = emailInput.value;
  const password = passInput.value;
  auth.signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      const userEmail = userCredential.user.email;
      if (!allowedAdmins.includes(userEmail)) {
        alert("❌ Access Denied");
        auth.signOut();
      } else {
        loginSection.style.display = "none";
        dashboard.classList.remove("hidden");
        loggedEmail.textContent = `Logged in as: ${userEmail}`;
        fetchFeedbacks();
      }
    })
    .catch(err => {
      loginError.textContent = "⚠️ " + err.message;
    });
};

logoutBtn.onclick = () => {
  auth.signOut().then(() => location.reload());
};

changePassBtn.onclick = () => {
  const currentPass = prompt("Enter current password:");
  const newPass = prompt("Enter new password:");

  const user = auth.currentUser;
  const email = user.email;

  const credential = firebase.auth.EmailAuthProvider.credential(email, currentPass);
  user.reauthenticateWithCredential(credential)
    .then(() => {
      user.updatePassword(newPass).then(() => {
        alert("✅ Password changed successfully");
      });
    })
    .catch(() => {
      alert("❌ Current password incorrect");
    });
};

function fetchFeedbacks() {
  db.ref("feedbacks").once("value", snapshot => {
    const data = snapshot.val();
    const list = document.getElementById("feedback-list");
    list.innerHTML = "";
    let count = 0;
    let totalRating = 0;

    for (let key in data) {
      const fb = data[key];
      count++;
      totalRating += Number(fb.rating || 0);

      const div = document.createElement("div");
      div.className = "feedback-card";
      div.innerHTML = `
        <p><strong>${fb.name}</strong> (${fb.rating}⭐)</p>
        <p>${fb.message}</p>
        ${fb.imageUrl ? `<img src="${fb.imageUrl}" class="thumb" />` : ""}
        <button onclick="deleteFeedback('${key}')">Delete</button>
      `;
      list.appendChild(div);
    }

    document.getElementById("total-reviews").textContent = count;
    document.getElementById("average-rating").textContent = count ? (totalRating / count).toFixed(1) : "0";
  });
}

function deleteFeedback(key) {
  if (confirm("Delete this feedback?")) {
    db.ref("feedbacks/" + key).remove().then(() => fetchFeedbacks());
  }
}

document.getElementById("delete-all-btn").onclick = () => {
  if (confirm("⚠️ Delete ALL feedbacks?")) {
    db.ref("feedbacks").remove().then(() => fetchFeedbacks());
  }
};

document.getElementById("export-btn").onclick = () => {
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
