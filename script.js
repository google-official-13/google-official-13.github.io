 const form = document.getElementById("feedback-form");
const averageDisplay = document.getElementById("average");
const reviewList = document.getElementById("review-list");
const popup = document.getElementById("popup");
const loader = document.getElementById("loader");
const filterRating = document.getElementById("filterRating");

const db = firebase.database().ref("feedbacks");
const imgbbAPIKey = "3a01fad3d6c23d5bab709c94eae3b9c9";

// ✅ Generate and store unique device ID
let deviceId = localStorage.getItem("deviceId");
if (!deviceId) {
  deviceId = crypto.randomUUID();
  localStorage.setItem("deviceId", deviceId);
}

// ✅ Firebase Auth
let currentUser = null;
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    form.name.value = user.displayName || "";
    form.email.value = user.email || "";
    form.name.readOnly = true;
    form.email.readOnly = true;
    form.style.display = "block";
    document.getElementById("user-info").innerText = `Signed in as ${user.displayName}`;
    document.getElementById("user-info").style.display = "block";
    document.getElementById("loginBtn").style.display = "none";
  } else {
    document.getElementById("loginBtn").addEventListener("click", () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(provider).catch(console.error);
    });
  }
});

// ✅ Format time ago
function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  const intervals = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60 };
  for (let unit in intervals) {
    const value = Math.floor(seconds / intervals[unit]);
    if (value >= 1) return `${value} ${unit}${value > 1 ? "s" : ""} ago`;
  }
  return "Just now";
}

// ✅ Success popup
function showPopup() {
  popup.classList.add("show");
  setTimeout(() => popup.classList.remove("show"), 3000);
}

// ✅ Submit handler
form.addEventListener("submit", function (e) {
  e.preventDefault();
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const message = form.message.value.trim();
  const rating = parseInt(form.rating.value);
  const imageFile = document.getElementById("imageUpload").files[0];

  loader.style.display = "block";

  const feedback = {
    name,
    email,
    message,
    rating,
    imageUrl: null,
    date: new Date().toISOString(),
    deviceId
  };

  localStorage.setItem("lastFeedback", JSON.stringify(feedback));

  const uploadAndSave = (imageUrl = null) => {
    feedback.imageUrl = imageUrl;
    db.push(feedback);
    form.reset();
    loader.style.display = "none";
    showPopup();
    setTimeout(loadReviews, 500);
  };

  if (imageFile) {
    const formData = new FormData();
    formData.append("image", imageFile);

    fetch(`https://api.imgbb.com/1/upload?key=${imgbbAPIKey}`, {
      method: "POST",
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) uploadAndSave(data.data.url);
        else {
          loader.style.display = "none";
          alert("Image upload failed.");
        }
      })
      .catch(() => {
        loader.style.display = "none";
        alert("Image upload failed.");
      });
  } else {
    uploadAndSave();
  }
});

// ✅ Mood emoji based on rating
function getMoodTag(rating) {
  if (rating >= 5) return "🌟 Loved it!";
  if (rating === 4) return "👍 Good";
  if (rating === 3) return "😐 Okay";
  return "👎 Needs Work";
}

// ✅ Load and display all reviews
function loadReviews() {
  db.once("value", snapshot => {
    const data = snapshot.val();
    const entries = Object.entries(data || {}).map(([id, value]) => ({ id, ...value }));
    const selectedRating = parseInt(filterRating.value || "0");

    const userEntries = entries.filter(e => e.deviceId === deviceId);
    const latestReview = userEntries.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const previousReview = userEntries.length > 1 ? userEntries[1] : null;

    let total = 0, count = 0;
    reviewList.innerHTML = "";

    entries
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach(entry => {
        if (selectedRating && entry.rating < selectedRating) return;

        total += entry.rating;
        count++;

        const div = document.createElement("div");
        div.classList.add("review-entry");

        // ✅ Past review toggle
        let previousToggle = "";
        if (latestReview && previousReview && entry.id === latestReview.id) {
          previousToggle = `
            <details style="margin-top: 8px;">
              <summary style="color: #ffcc00; cursor: pointer;">Your past review</summary>
              <div style="font-size: 13px; margin-top: 5px; color: #bbb;">
                <em>${previousReview.message}</em>
              </div>
            </details>`;
        }

        div.innerHTML = `
          <div style="display: flex; align-items: center; margin-bottom: 5px;">
            <div class="avatar">${entry.name.charAt(0).toUpperCase()}</div>
            <div>
              <strong>${entry.name}</strong>
              <div style="font-size: 12px; color: #aaa;">${entry.email}</div>
            </div>
          </div>
          <p>${entry.message}</p>
          ${previousToggle}
          <p>⭐ ${entry.rating} <span class="mood-tag">${getMoodTag(entry.rating)}</span> <span class="review-time">· ${timeAgo(entry.date)}</span></p>
          ${entry.imageUrl ? `<img src="${entry.imageUrl}" onclick="this.classList.toggle('enlarged')">` : ""}
          <hr>
        `;

        reviewList.appendChild(div);
      });

    averageDisplay.textContent = count ? (total / count).toFixed(1) + " / 5" : "N/A";
  });
}

// ✅ Filter listener
filterRating.addEventListener("change", loadReviews);

// ✅ Initial load
loadReviews();
