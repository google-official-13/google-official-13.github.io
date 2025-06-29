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

  const review = {
    message,
    rating,
    imageUrl: null,
    date: new Date().toISOString(),
  };

  const uploadAndSave = (imageUrl = null) => {
    review.imageUrl = imageUrl;
    const userKey = currentUser?.uid || deviceId;
    const feedbackRef = db.child(userKey);
    feedbackRef.once("value", snap => {
      const data = snap.val();
      if (data) {
        const reviews = data.reviews || [];
        reviews.push(review);
        feedbackRef.update({
          name,
          email,
          profilePic: currentUser?.photoURL || null,
          reviews
        });
      } else {
        feedbackRef.set({
          name,
          email,
          profilePic: currentUser?.photoURL || null,
          reviews: [review]
        });
      }
      form.reset();
      loader.style.display = "none";
      showPopup();
      setTimeout(loadReviews, 500);
    });
  };

  if (imageFile) {
    if (!imageFile.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      loader.style.display = "none";
      return;
    }
    if (imageFile.size > 5 * 1024 * 1024) {
      alert("Image too large, max 5MB allowed.");
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
          alert("Image upload failed.");
          loader.style.display = "none";
        }
      })
      .catch(() => {
        alert("Image upload error.");
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

document.getElementById("image-modal").addEventListener("click", () => {
  document.getElementById("image-modal").style.display = "none";
});

function toggleLike(feedbackId, index) {
  const ref = db.child(feedbackId).child("likes");
  ref.once("value", snap => {
    let likes = snap.val() || [];
    const uid = currentUser?.uid || deviceId;
    const key = `${uid}-${index}`;
    const i = likes.indexOf(key);
    if (i > -1) likes.splice(i, 1);
    else likes.push(key);
    ref.set(likes).then(loadReviews);
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
    const entries = Object.entries(data);
    let total = 0, count = 0;
    reviewList.innerHTML = "";

    entries.forEach(([userKey, val]) => {
      const reviews = val.reviews || [];
      if (!reviews.length) return;
      reviews.sort((a,b) => new Date(b.date) - new Date(a.date));
      const latest = reviews[0];
      total += latest.rating;
      count++;

      const div = document.createElement("div");
      div.classList.add("review-entry");

      const avatar = val.profilePic
        ? `<img src="${val.profilePic}" class="avatar">`
        : `<div class="avatar">${val.name.charAt(0).toUpperCase()}</div>`;

      const imageTag = latest.imageUrl
        ? `<img src="${latest.imageUrl}" class="thumbnail" onclick="enlargeImage(this)">`
        : "";

      let pastHTML = "";
      if (reviews.length > 1) {
        pastHTML = `<button class="show-more">Show Past Reviews</button>
        <div class="past-reviews" style="display:none;">`;
        reviews.slice(1).forEach(r => {
          pastHTML += `
            <div class="past-review-item">
              <div class="review-text">${r.message}</div>
              <div class="review-footer">
                <span class="mood-tag">${getMoodTag(r.rating)}</span>
                <span class="review-time">(${timeAgo(r.date)})</span>
              </div>
            </div>`;
        });
        pastHTML += `</div>`;
      }

      div.innerHTML = `
        <div class="review-header">
          ${avatar}
          <div class="review-user-info">
            <span class="name">${val.name}</span>
            <span class="email">${val.email}</span>
          </div>
        </div>
        <div class="review-text">${latest.message}</div>
        ${imageTag}
       <div class="review-footer">
  <span class="mood-tag">${getMoodTag(latest.rating)}</span>
  <span class="review-time">${timeAgo(latest.date)}</span>
  <span class="like-btn" onclick="toggleLike('${userKey}', 0)">
    ❤️ ${val.likes?.filter(l => l.startsWith((currentUser?.uid || deviceId) + '-')).length || 0}
  </span>
</div>

        ${pastHTML}
      `;
      reviewList.appendChild(div);
    });

    averageDisplay.textContent = count ? `${(total/count).toFixed(1)} / 5` : "N/A";
    document.getElementById("reviewCount").textContent = count ? `${count} Reviews` : "";
    loader.style.display = "none";

    document.querySelectorAll(".show-more").forEach(btn => {
      btn.addEventListener("click", () => {
        const next = btn.nextElementSibling;
        next.style.display = next.style.display === "block" ? "none" : "block";
        btn.textContent = next.style.display === "block" ? "Hide Past Reviews" : "Show Past Reviews";
      });
    });
  });
}

filterRating.addEventListener("change", loadReviews);
loadReviews();
