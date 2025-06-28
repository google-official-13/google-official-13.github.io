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
    if (!imageFile.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      loader.style.display = "none";
      return;
    }
    if (imageFile.size > 5 * 1024 * 1024) {
      alert("Image is too large. Please upload under 5MB.");
      loader.style.display = "none";
      return;
    }

    const formData = new FormData();
    formData.append("image", imageFile);

    fetch(`https://api.imgbb.com/1/upload?key=${imgbbAPIKey}`, {
      method: "POST",
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.url) {
          uploadAndSave(data.data.url);
        } else {
          alert("Image upload failed. Please try again.");
          loader.style.display = "none";
        }
      })
      .catch(() => {
        alert("Image upload failed. Check your internet connection.");
        loader.style.display = "none";
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

function deleteReview(feedbackId, userId) {
  if (!currentUser || currentUser.uid !== userId) return;
  if (confirm("Are you sure you want to delete this review?")) {
    db.child(feedbackId).remove().then(loadReviews);
  }
}

function loadReviews() {
  db.once("value", snapshot => {
    const data = snapshot.val();
    if (!data) {
      reviewList.innerHTML = "";
      averageDisplay.textContent = "N/A";
      return;
    }

    const userGrouped = {};

    for (const [id, val] of Object.entries(data)) {
      const key = val.userId || val.deviceId;
      if (!userGrouped[key]) userGrouped[key] = [];
      userGrouped[key].push({ id, ...val });
    }

    let total = 0, count = 0;
    reviewList.innerHTML = "";

    for (const userKey in userGrouped) {
      const reviews = userGrouped[userKey].sort((a, b) => new Date(b.date) - new Date(a.date));
      const firstReview = reviews[0];
      const otherReviews = reviews.slice(1);

      const selectedRating = parseInt(filterRating.value || "0");
      if (selectedRating && firstReview.rating < selectedRating) continue;

      total += firstReview.rating;
      count++;

      const div = document.createElement("div");
      div.classList.add("review-entry");

      const avatar = firstReview.profilePic
        ? `<img src="${firstReview.profilePic}" class="avatar">`
        : `<div class="avatar">${firstReview.name.charAt(0).toUpperCase()}</div>`;

      const imageTag = firstReview.imageUrl
        ? `<img src="${firstReview.imageUrl}" class="thumbnail" onclick="enlargeImage(this)">`
        : "";

      const uid = currentUser?.uid || deviceId;
      const isLiked = firstReview.likes?.includes(uid);
      const likeIcon = isLiked ? "fas" : "far";

      const likeBtn = `
        <div class="like-circle" onclick="toggleLike('${firstReview.id}')">
          <i class="${likeIcon} fa-thumbs-up"></i>
          <span>${firstReview.likes?.length || 0}</span>
        </div>`;

      const deleteBtn = (currentUser && currentUser.uid === firstReview.userId)
        ? `<button class="admin-btn danger" style="margin-top:5px;" onclick="deleteReview('${firstReview.id}', '${firstReview.userId}')">
              <i class="fas fa-trash"></i> Delete
           </button>`
        : "";

      let previousReviewsHtml = "";
     if (otherReviews.length) {
  html += `
    <div class="previous-reviews">
      <strong>Previous Reviews:</strong>
      ${otherReviews.map(r => {
        const avatar = r.profilePic
          ? `<img src="${r.profilePic}" class="avatar">`
          : `<div class="avatar">${r.name.charAt(0).toUpperCase()}</div>`;
        return `
          <div class="previous-review-item">
            <div class="review-header">
              ${avatar}
              <div class="review-user-info">
                <span class="name">${r.name}</span>
                <span class="email">${r.email}</span>
              </div>
            </div>
            <div style="margin:4px 0;">${r.message}</div>
            <span class="review-time">· ${timeAgo(r.date)}</span>
          </div>
        `;
      }).join("")}
    </div>`;
}


      div.innerHTML = `
        <div class="review-header">
          ${avatar}
          <div class="review-user-info">
            <span class="name">${firstReview.name}</span>
            <span class="email">${firstReview.email}</span>
          </div>
        </div>
        <div style="margin: 10px 0;">${firstReview.message}</div>
        ${imageTag}
        ${likeBtn}
        <div class="review-footer">
          <span class="mood-tag">${getMoodTag(firstReview.rating)}</span>
          <span class="review-time">${timeAgo(firstReview.date)}</span>
        </div>
        ${deleteBtn}
        ${previousReviewsHtml}
      `;
      reviewList.appendChild(div);
    }

    averageDisplay.textContent = count ? `${(total / count).toFixed(1)} / 5` : "N/A";
    document.getElementById("reviewCount").textContent = count ? `${count} Reviews` : "";

    loader.style.display = "none";
  });
}

document.getElementById("image-modal").addEventListener("click", closeModal);
filterRating.addEventListener("change", loadReviews);
loadReviews();
