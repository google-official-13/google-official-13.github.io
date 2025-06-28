// Handle mobile redirect login
firebase.auth().getRedirectResult().then(result => {
  if (result.user) {
    console.log("Redirect login success");
  }
}).catch(error => {
  console.error("Redirect login error", error);
});

window.onload = function () {
  const ADMIN_EMAILS = [
    "ritikbhalwala1@gmail.com",
    "malvifenil0@gmail.com"
  ];

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
      document.getElementById("admin-welcome").style.opacity = "1";
      setTimeout(() => document.getElementById("admin-welcome").style.opacity = "0", 3000);
      loadAdminReviews();
    } else {
      currentAdmin = null;
      adminContent.style.display = "none";
    }
  });

  adminLoginBtn.addEventListener("click", () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    if (window.innerWidth < 768) {
      firebase.auth().signInWithRedirect(provider);
    } else {
      firebase.auth().signInWithPopup(provider).catch(console.error);
    }
  });

  adminLogoutBtn.addEventListener("click", () => {
    firebase.auth().signOut().then(() => location.reload());
  });

  refreshBtn.addEventListener("click", loadAdminReviews);
  filterSelect.addEventListener("change", loadAdminReviews);

  deleteAllBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete ALL feedbacks?")) {
      firebase.database().ref("feedbacks").remove().then(() => {
        alert("All feedbacks deleted.");
        loadAdminReviews();
      });
    }
  });

  exportBtn.addEventListener("click", () => {
    firebase.database().ref("feedbacks").once("value").then(snapshot => {
      const data = snapshot.val();
      if (!data) return alert("No reviews to export.");

      const rows = [["Name", "Email", "Message", "Rating", "Date"]];
      Object.values(data).forEach(item => {
        rows.push([
          item.name || "",
          item.email || "",
          (item.message || "").replace(/(\r\n|\n|\r)/gm, " "),
          item.rating || "",
          item.date || ""
        ]);
      });

      const csv = rows.map(row => row.map(v => `"${v}"`).join(",")).join("\n");
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
      const today = new Date().toISOString().slice(0, 10);
      const selected = parseInt(filterSelect?.value || 0);

      if (data) {
        Object.entries(data).forEach(([id, item]) => {
          const rating = parseInt(item.rating);
          if (!rating || (selected && rating < selected)) return;

          total += rating;
          count++;
          if ((item.date || "").slice(0, 10) === today) todayCount++;

          const div = document.createElement("div");
          div.className = "review-entry";
          div.style.cssText = "margin-bottom:10px;padding:10px;border:1px solid #ccc;border-radius:5px;";
          div.innerHTML = `
            <strong>${item.name || "Anonymous"}</strong> (${item.email || "No Email"})<br/>
            <small>${item.date || "No Date"}</small><br/>
            Rating: ${rating} ⭐<br/>
            Message: ${item.message || "No message"}<br/>
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

  window.deleteReview = function (id) {
    if (confirm("Delete this review?")) {
      firebase.database().ref("feedbacks").child(id).remove().then(loadAdminReviews);
    }
  };
};
