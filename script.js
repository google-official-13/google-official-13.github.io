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
  if (rating >= 5) return '<i class="fas fa-face-grin-stars"></i> Loved it!';
  if (rating === 4) return '<i class="fas fa-thumbs-up"></i> Good';
  if (rating === 3) return '<i class="fas fa-meh"></i> Okay';
  return '<i class="fas fa-thumbs-down"></i> Needs Work';
}

function enlargeImage(img) {
  const modal = document.getElementById("image-modal");
  const modalImg = document.getElementById("modal-img");
  modalImg.src = img.src;
  modal.style.display = "flex";
}

function closeModal() {
  document.getElementById("image-modal").style.display = "none";
}

function toggleLike(feedbackId) {
  const ref = db.child(feedbackId).child("likes");
  ref.once("value", snap => {
    let likes = snap.val() || [];
    const uid = currentUser?.uid || deviceId;
    const index = likes.indexOf(uid);
    if (index > -1) likes.splice(index, 1);
    else likes.push(uid);
    ref.set(likes).then(loadReviews);
  });
}

function toggleReplyBox(btn) {
  const box = btn.closest(".review-entry").querySelector(".reply-box");
  if (box) box.style.display = box.style.display === "block" ? "none" : "block";
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

function escapeQuotes(text) {
  return text.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

function toggleMenu(btn) {
  const menu = btn.nextElementSibling;
  document.querySelectorAll(".menu-dropdown").forEach(m => {
    if (m !== menu) m.style.display = "none";
  });
  menu.style.display = menu.style.display === "block" ? "none" : "block";
  document.addEventListener("click", function handler(e) {
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
      menu.style.display = "none";
      document.removeEventListener("click", handler);
    }
  });
}

function loadReviews() {
  db.once("value", snapshot => {
    const data = snapshot.val();
    if (!data) {
      reviewList.innerHTML = "";
      averageDisplay.textContent = "N/A";
      return;
    }

    const entriesMap = {};
    Object.entries(data).forEach(([id, val]) => {
      const key = val.userId || val.deviceId;
      if (!entriesMap[key] || new Date(val.date) > new Date(entriesMap[key].date)) {
        entriesMap[key] = { id, ...val };
      }
    });

    const entries = Object.values(entriesMap);
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
        ? `<img src="${entry.imageUrl}" class="thumbnail" onclick="enlargeImage(this)">`
        : "";

      const uid = currentUser?.uid || deviceId;
      const isLiked = entry.likes?.includes(uid);
      const likeIcon = isLiked ? "fas" : "far";
      const likeBtn = `<button class="like-btn" onclick="toggleLike('${entry.id}')"><i class="${likeIcon} fa-heart"></i> ${entry.likes?.length || 0}</button>`;

      const replyBtn = currentUser
        ? `<button class="reply-btn" onclick="toggleReplyBox(this)"><i class="fas fa-reply"></i> Reply</button>`
        : "";

      let repliesHTML = "";
      if (entry.replies) {
        Object.entries(entry.replies).forEach(([rid, rep]) => {
          const canEdit = currentUser && currentUser.uid === rep.userId;
          const diff = (new Date() - new Date(rep.date)) / 60000;
          const menu = canEdit ? `
            <div class="three-dot-menu">
              <i class="fas fa-ellipsis-v" onclick="toggleMenu(this)"></i>
              <div class="menu-dropdown">
                ${diff < 5 ? `<button onclick="editReply('${entry.id}', '${rid}', '${escapeQuotes(rep.message)}', '${rep.date}')">Edit</button>` : ""}
                <button onclick="deleteReply('${entry.id}', '${rid}')">Delete</button>
              </div>
            </div>` : "";
          repliesHTML += `
            <div class="reply-entry">
              ${menu}
              <strong>${rep.name}</strong>: ${rep.message}
              <span class="review-time">· ${timeAgo(rep.date)}</span>
            </div>`;
        });
      }

      const replyBox = currentUser
        ? `<div class="reply-box" style="display:none;">
             <textarea placeholder="Write a reply..."></textarea>
             <button onclick="submitReply('${entry.id}', this.previousElementSibling)">Send</button>
           </div>`
        : "";

      const emojiOnly = /^[\p{Emoji}\s]+$/u.test(entry.message) && entry.message.length <= 8;
      const messageClass = emojiOnly ? "emoji-feedback" : "";

      div.innerHTML = `
        <div class="review-header">
          ${avatar}
          <div class="review-user-info">
            <span class="name">${entry.name}</span>
            <span class="email">${entry.email}</span>
          </div>
        </div>
        <div class="${messageClass}" style="margin: 10px 0; font-size: ${emojiOnly ? "22px" : "15px"};">
          ${entry.message}
        </div>
        ${imageTag}
        <div class="reply-actions">
          ${likeBtn}
          ${replyBtn}
        </div>
        <div class="review-footer">
          <span class="mood-tag">${getMoodTag(entry.rating)}</span>
          <span class="review-time">${timeAgo(entry.date)}</span>
        </div>
        <div class="reply-section">
          ${repliesHTML}
          ${replyBox}
        </div>
      `;

      reviewList.appendChild(div);
    });

    averageDisplay.textContent = count ? `${(total / count).toFixed(1)} / 5` : "N/A";
document.getElementById("reviewCount").textContent = count ? `${count} Reviews` : "";

    loader.style.display = "none";
  });
}

document.getElementById("image-modal").addEventListener("click", closeModal);
filterRating.addEventListener("change", loadReviews);
loadReviews();
