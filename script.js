// ✅ DOM elements
const form = document.getElementById("feedback-form");
const averageDisplay = document.getElementById("average");
const reviewList = document.getElementById("review-list");
const popup = document.getElementById("popup");
const loader = document.getElementById("loader");
const filterRating = document.getElementById("filterRating");

const db = firebase.database().ref("feedbacks");
const imgbbAPIKey = "3a01fad3d6c23d5bab709c94eae3b9c9";

// ✅ Unique device ID fallback
let deviceId = localStorage.getItem("deviceId");
if (!deviceId) {
  deviceId = crypto.randomUUID();
  localStorage.setItem("deviceId", deviceId);
}

// ✅ Firebase auth
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

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  const intervals = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60 };
  for (let unit in intervals) {
    const value = Math.floor(seconds / intervals[unit]);
    if (value >= 1) return `${value} ${unit}${value > 1 ? "s" : ""} ago`;
  }
  return "Just now";
}

function showPopup() {
  popup.classList.add("show");
  setTimeout(() => popup.classList.remove("show"), 3000);
}

// ✅ EmailJS notification
function sendEmail(to, msg, sender) {
  emailjs.send("service_exqnwp4", "template_ro7gyom", {
    to_email: to,
    message: msg,
    sender_name: sender
  }, "b2bU5JAhe0VtZv5al").then(() => {
    console.log("Email sent!");
  }).catch(console.error);
}

// ✅ Form submit
form.addEventListener("submit", function (e) {
  e.preventDefault();
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const message = form.message.value.trim();
  const rating = parseInt(form.rating.value);
  const imageFile = document.getElementById("imageUpload").files[0];

  loader.style.display = "block";

  const feedback = {
    name, email, message, rating,
    imageUrl: null,
    profilePic: currentUser?.photoURL || null,
    date: new Date().toISOString(),
    deviceId,
    userId: currentUser?.uid || null,
    likes: [],
    replies: {}
  };

  const uploadAndSave = (imageUrl = null) => {
    feedback.imageUrl = imageUrl;

    // 🔄 Move old feedback to replies (as pastReview)
    db.once("value", snap => {
      const all = snap.val() || {};
      let oldId = null;
      let oldData = null;
      Object.entries(all).forEach(([id, val]) => {
        const key = val.userId || val.deviceId;
        if (key === (currentUser?.uid || deviceId)) {
          if (!oldData || new Date(val.date) > new Date(oldData.date)) {
            oldId = id;
            oldData = val;
          }
        }
      });

      if (oldId) {
        db.child(oldId).remove();
        feedback.pastReview = oldData;
      }

      db.push(feedback);
      form.reset();
      loader.style.display = "none";
      showPopup();
      setTimeout(loadReviews, 500);
    });
  };

  if (imageFile) {
    if (!imageFile.type.startsWith("image/")) return alert("Invalid image");
    if (imageFile.size > 5 * 1024 * 1024) return alert("Image too large (max 5MB)");

    const formData = new FormData();
    formData.append("image", imageFile);
    fetch(`https://api.imgbb.com/1/upload?key=${imgbbAPIKey}`, {
      method: "POST",
      body: formData
    }).then(res => res.json())
      .then(data => {
        if (data.success && data.data?.url) uploadAndSave(data.data.url);
        else alert("Upload failed");
      }).catch(() => alert("Upload error"));
  } else {
    uploadAndSave();
  }
});

function renderPastReview(past) {
  if (!past) return "";
  const image = past.imageUrl ? `<img src="${past.imageUrl}" class="thumbnail">` : "";
  return `
    <div class="past-review-toggle" onclick="this.nextElementSibling.classList.toggle('show')">
      Your Past Review <span style="font-size:14px;">▼</span>
    </div>
    <div class="past-review-content">
      <div>${past.message}</div>
      ${image}
      <span class="mood-tag">${getMoodTag(past.rating)}</span>
      <span class="review-time">${timeAgo(past.date)}</span>
    </div>`;
}

function getMoodTag(rating) {
  if (rating >= 5) return '<i class="fas fa-face-grin-stars"></i> Loved it!';
  if (rating === 4) return '<i class="fas fa-thumbs-up"></i> Good';
  if (rating === 3) return '<i class="fas fa-meh"></i> Okay';
  return '<i class="fas fa-thumbs-down"></i> Needs Work';
}

function loadReviews() {
  db.once("value", snap => {
    const data = snap.val();
    reviewList.innerHTML = "";
    if (!data) return;

    const selectedRating = parseInt(filterRating.value || "0");
    const entries = Object.entries(data).map(([id, val]) => ({ id, ...val }))
      .filter(e => !selectedRating || e.rating >= selectedRating)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    let total = 0;
    entries.forEach(entry => total += entry.rating);
    averageDisplay.textContent = entries.length ? `${(total / entries.length).toFixed(1)} / 5` : "N/A";
    document.getElementById("reviewCount").textContent = `${entries.length} Reviews`;

    entries.forEach(entry => {
      const div = document.createElement("div");
      div.className = "review-entry";

      const avatar = entry.profilePic
        ? `<div class="avatar"><img src="${entry.profilePic}"/></div>`
        : `<div class="avatar">${entry.name[0].toUpperCase()}</div>`;

      const image = entry.imageUrl ? `<img src="${entry.imageUrl}" class="thumbnail">` : "";

      const likeIcon = entry.likes?.includes(currentUser?.uid || deviceId) ? "fas" : "far";

      const likeBtn = `
        <div class="like-circle" onclick="toggleLike('${entry.id}')">
          <i class="${likeIcon} fa-thumbs-up"></i>
          <span>${entry.likes?.length || 0}</span>
        </div>`;

      const repliesHTML = Object.entries(entry.replies || {}).map(([rid, r]) => `
        <div class="reply-entry">
          <strong>${r.name}</strong>: ${r.message}
          <span class="review-time">${timeAgo(r.date)}</span>
        </div>`).join("");

      div.innerHTML = `
        <div class="review-header">
          ${avatar}
          <div class="review-user-info">
            <span class="name">${entry.name}</span>
            <span class="email">${entry.email}</span>
          </div>
        </div>
        <div style="margin:10px 0">${entry.message}</div>
        ${image}
        ${renderPastReview(entry.pastReview)}
        ${likeBtn}
        <div class="review-footer">
          <span class="mood-tag">${getMoodTag(entry.rating)}</span>
          <span class="review-time">${timeAgo(entry.date)}</span>
        </div>
        <div class="reply-section">${repliesHTML}</div>`;

      reviewList.appendChild(div);
    });
  });
}

// ✅ Event listeners
document.getElementById("image-modal")?.addEventListener("click", () => document.getElementById("image-modal").style.display = "none");
filterRating.addEventListener("change", loadReviews);
loadReviews();
