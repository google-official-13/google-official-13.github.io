const db = firebase.database();
const auth = firebase.auth();
const reviewList = document.getElementById("reviewList");
const totalReviewsEl = document.getElementById("totalReviews");
const avgRatingEl = document.getElementById("avgRating");
const totalLikesEl = document.getElementById("totalLikes");

let allReviews = [];

function fetchReviews() {
  db.ref("feedbacks").once("value", (snapshot) => {
    reviewList.innerHTML = "";
    allReviews = [];
    let totalRating = 0;
    let totalLikes = 0;

    snapshot.forEach((childSnap) => {
      const data = childSnap.val();
      if (!data.rating) return;

      allReviews.push(data);
      totalRating += data.rating;
      totalLikes += data.likes || 0;

      const div = document.createElement("div");
      div.className = "review";
      div.innerHTML = `
        <h4>${data.name} (${data.rating}★)</h4>
        <p>${data.message}</p>
        <small>${data.email || "Anonymous"}</small><br><br>
        <button onclick="deleteReview('${childSnap.key}')">Delete</button>
      `;
      reviewList.appendChild(div);
    });

    totalReviewsEl.textContent = allReviews.length;
    avgRatingEl.textContent = allReviews.length ? (totalRating / allReviews.length).toFixed(2) : 0;
    totalLikesEl.textContent = totalLikes;
  });
}

function deleteReview(key) {
  if (confirm("Delete this review?")) {
    db.ref("feedbacks/" + key).remove().then(fetchReviews);
  }
}

// Export CSV
const exportBtn = document.getElementById("exportBtn");
exportBtn.addEventListener("click", () => {
  let csv = "Name,Email,Rating,Message\n";
  allReviews.forEach(r => {
    csv += `${r.name || "-"},${r.email || "-"},${r.rating},"${r.message.replace(/"/g, '"')}"\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "feedback_export.csv";
  a.click();
});

// Password Change
const changePasswordBtn = document.getElementById("changePasswordBtn");
changePasswordBtn.addEventListener("click", () => {
  const current = document.getElementById("currentPassword").value;
  const newPass = document.getElementById("newPassword").value;
  const user = auth.currentUser;
  if (!current || !newPass) return alert("Fill both fields");

  const cred = firebase.auth.EmailAuthProvider.credential(user.email, current);
  user.reauthenticateWithCredential(cred)
    .then(() => user.updatePassword(newPass))
    .then(() => alert("Password updated successfully!"))
    .catch((err) => alert("Failed: " + err.message));
});

// Auto fetch reviews on load
auth.onAuthStateChanged((user) => {
  if (user) fetchReviews();
  else window.location.href = "admin.html";
});
