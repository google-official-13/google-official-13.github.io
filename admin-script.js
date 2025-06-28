const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");
const adminUserInfo = document.getElementById("admin-user-info");
const adminContent = document.getElementById("admin-content");
const adminLoader = document.getElementById("admin-loader");
const reviewList = document.getElementById("admin-review-list");
const filterSelect = document.getElementById("adminFilterRating");
const refreshBtn = document.getElementById("refreshBtn");
const exportBtn = document.getElementById("exportBtn");
const deleteAllBtn = document.getElementById("deleteAllBtn");

let currentAdmin = null;

firebase.auth().onAuthStateChanged(user => {
  if (user && ADMIN_EMAILS.includes(user.email)) {
    currentAdmin = user;
    adminUserInfo.textContent = `Signed in as ${user.displayName} (${user.email})`;
    adminUserInfo.style.display = "block";
    adminLogoutBtn.style.display = "inline-block";
    adminLoginBtn.style.display = "none";
    adminContent.style.display = "block";
    loadAdminReviews();
  } else {
    currentAdmin = null;
    adminContent.style.display = "none";
  }
});

adminLoginBtn.addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider).catch(console.error);
});

adminLogoutBtn.addEventListener("click", () => {
  firebase.auth().signOut();
  location.reload();
});

refreshBtn.addEventListener("click", loadAdminReviews);

filterSelect.addEventListener("change", loadAdminReviews);

deleteAllBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to delete ALL feedbacks? This cannot be undone.")) {
    firebase.database().ref("feedbacks").remove().then(() => {
      alert("All feedbacks deleted.");
      loadAdminReviews();
    });
  }
});

exportBtn.addEventListener("click", () => {
  firebase.database().ref("feedbacks").once("value").then(snapshot => {
    const data = snapshot.val();
    if (!data) {
      alert("No reviews to export.");
      return;
    }
    const rows = [["Name", "Email", "Message", "Rating", "Date"]];
    Object.values(data).forEach(item => {
      rows.push([
        item.name,
        item.email,
        item.message,
        item.rating,
        item.date
      ]);
    });
    let csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "feedbacks.csv";
    a.click();
  });
});

function loadAdminReviews() {
  adminLoader.style.display = "block";
  reviewList.innerHTML = "";
  firebase.database().ref("feedbacks").once("value").then(snapshot => {
    const data = snapshot.val();
    let count = 0, total = 0, todayCount = 0;

    if (data) {
      const today = new Date().toISOString().slice(0, 10);
      Object.entries(data).forEach(([id, item]) => {
        const rating = parseInt(item.rating);
        total += rating;
        count++;
        if (item.date.slice(0, 10) === today) {
          todayCount++;
        }
        const selected = parseInt(filterSelect.value) || 0;
        if (selected && rating < selected) return;

        const div = document.createElement("div");
        div.classList.add("review-entry");
        div.style.marginBottom = "10px";
        div.style.padding = "10px";
        div.style.border = "1px solid #ccc";
        div.style.borderRadius = "5px";
        div.innerHTML = `
          <strong>${item.name}</strong> (${item.email})<br/>
          <small>${item.date}</small><br/>
          Rating: ${rating} ⭐<br/>
          Message: ${item.message}<br/>
          <button class="admin-btn danger" onclick="deleteReview('${id}')">
            <i class="fas fa-trash"></i> Delete
          </button>
        `;
        reviewList.appendChild(div);
      });
    }

    document.getElementById("total-reviews").textContent = count;
    document.getElementById("avg-rating").textContent = count ? (total / count).toFixed(1) : "0";
    document.getElementById("today-reviews").textContent = todayCount;
    adminLoader.style.display = "none";
  });
}

function deleteReview(id) {
  if (confirm("Delete this review?")) {
    firebase.database().ref("feedbacks").child(id).remove().then(() => {
      loadAdminReviews();
    });
  }
}
