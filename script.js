// script.js – Full version with replies, likes (review & replies), edit/delete, and 5-minute rule

const form = document.getElementById("feedback-form");
const averageDisplay = document.getElementById("average");
const reviewList = document.getElementById("review-list");
const popup = document.getElementById("popup");
const loader = document.getElementById("loader");
const filterRating = document.getElementById("filterRating");

const db = firebase.database().ref("feedbacks");
const imgbbAPIKey = "3a01fad3d6c23d5bab709c94eae3b9c9";

let deviceId = localStorage.getItem("deviceId");
if (!deviceId) {
  deviceId = crypto.randomUUID();
  localStorage.setItem("deviceId", deviceId);
}

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
    profilePic: currentUser?.photoURL || null,
    date: new Date().toISOString(),
    deviceId,
    userId: currentUser?.uid || null,
    likes: [],
    replies: {}
  };

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

function getMoodTag(rating) {
  if (rating >= 5) return "🌟 Loved it!";
  if (rating === 4) return "👍 Good";
  if (rating === 3) return "😐 Okay";
  return "👎 Needs Work";
}

function enlargeImage(img) {
  const modal = document.getElementById("image-modal");
  const modalImg = document.getElementById("modal-img");
  modalImg.src = img.src;
  modal.style.display = "flex";
}

function toggleLike(feedbackId) {
  const ref = db.child(feedbackId).child("likes");
  ref.once("value", snap => {
    let likes = snap.val() || [];
    const userKey = currentUser?.uid || deviceId;
    const index = likes.indexOf(userKey);
    if (index > -1) likes.splice(index, 1);
    else likes.push(userKey);
    ref.set(likes).then(loadReviews);
  });
}

function toggleReplyLike(feedbackId, replyId) {
  const ref = db.child(feedbackId).child("replies").child(replyId).child("likes");
  ref.once("value", snap => {
    let likes = snap.val() || [];
    const userKey = currentUser?.uid || deviceId;
    const index = likes.indexOf(userKey);
    if (index > -1) likes.splice(index, 1);
    else likes.push(userKey);
    ref.set(likes).then(loadReviews);
  });
}

function submitReply(feedbackId, textarea) {
  const replyText = textarea.value.trim();
  if (!replyText) return;
  const reply = {
    message: replyText,
    name: currentUser.displayName,
    email: currentUser.email,
    userId: currentUser.uid,
    profilePic: currentUser.photoURL || null,
    date: new Date().toISOString(),
    likes: []
  };
  db.child(feedbackId).child("replies").push(reply).then(loadReviews);
}

function deleteReply(feedbackId, replyId) {
  db.child(feedbackId).child("replies").child(replyId).remove().then(loadReviews);
}

function editReply(feedbackId, replyId, oldMsg, date) {
  const diff = (new Date() - new Date(date)) / 60000;
  if (diff > 5) return alert("You can only edit within 5 minutes");
  const newMsg = prompt("Edit your reply:", oldMsg);
  if (newMsg && newMsg.trim()) {
    db.child(feedbackId).child("replies").child(replyId).update({ message: newMsg.trim() }).then(loadReviews);
  }
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function loadReviews() {
  db.once("value", snapshot => {
    const data = snapshot.val();
    const entries = Object.entries(data || {}).map(([id, value]) => ({ id, ...value }));
    const selectedRating = parseInt(filterRating.value || "0");

    let total = 0, count = 0;
    reviewList.innerHTML = "";

    entries.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(entry => {
      if (selectedRating && entry.rating < selectedRating) return;

      total += entry.rating;
      count++;

      const div = document.createElement("div");
      div.classList.add("review-entry");

      const avatar = entry.profilePic
        ? `<img src="${entry.profilePic}" class="avatar">`
        : `<div class="avatar">${entry.name.charAt(0).toUpperCase()}</div>`;

      const imageTag = entry.imageUrl
        ? `<img src="${entry.imageUrl}" class="thumbnail-img" onclick="enlargeImage(this)">`
        : "";

      const userKey = currentUser?.uid || deviceId;
      const isLiked = entry.likes?.includes(userKey);
      const likeBtn = `<button onclick="toggleLike('${entry.id}')">${isLiked ? "❤️" : "🤍"} ${entry.likes?.length || 0}</button>`;

      let replySection = "";
      if (currentUser) {
        replySection = `
          <div class="reply-box">
            <textarea placeholder="Write a reply..."></textarea>
            <button onclick="submitReply('${entry.id}', this.previousElementSibling)">📩 Reply</button>
          </div>`;
      }

      let repliesHTML = "";
      if (entry.replies) {
        Object.entries(entry.replies).forEach(([rid, rep]) => {
          const repUserKey = currentUser?.uid || deviceId;
          const liked = rep.likes?.includes(repUserKey);
          const likeReplyBtn = `<button onclick="toggleReplyLike('${entry.id}', '${rid}')">${liked ? "❤️" : "🤍"} ${rep.likes?.length || 0}</button>`;
          const canEdit = currentUser && currentUser.uid === rep.userId;
          const diff = (new Date() - new Date(rep.date)) / 60000;
          repliesHTML += `
            <div class="reply-entry">
              <strong>${rep.name}</strong>: ${escapeHTML(rep.message)}
              <span class="review-time">· ${timeAgo(rep.date)}</span>
              <div class="reply-actions">
                ${likeReplyBtn}
                ${canEdit ? `
                  ${diff < 5 ? `<button onclick="editReply('${entry.id}', '${rid}', '${rep.message.replace(/'/g, "\\'")}', '${rep.date}')">✏️ Edit</button>` : ""}
                  <button onclick="deleteReply('${entry.id}', '${rid}')">🗑️ Delete</button>` : ""}
              </div>
            </div>`;
        });
      }

      div.innerHTML = `
        <div class="review-header">
          ${avatar}
          <div class="review-user-info">
            <span class="name">${entry.name}</span>
            <span class="email">${entry.email}</span>
          </div>
        </div>
        <p>${escapeHTML(entry.message)}</p>
        <p>⭐ ${entry.rating} <span class="mood-tag">${getMoodTag(entry.rating)}</span> <span class="review-time">· ${timeAgo(entry.date)}</span></p>
        ${imageTag}
        <div class="review-actions">${likeBtn}</div>
        <div class="reply-section">
          ${repliesHTML}
          ${replySection}
        </div>
      `;

      reviewList.appendChild(div);
    });

    averageDisplay.textContent = count ? `${(total / count).toFixed(1)} / 5 (${count} reviews)` : "N/A";
  });
}

filterRating.addEventListener("change", loadReviews);
loadReviews();
