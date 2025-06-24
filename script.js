 const form = document.getElementById("feedback-form");
const averageDisplay = document.getElementById("average");
const reviewList = document.getElementById("review-list");
const popup = document.getElementById("popup");
const loader = document.getElementById("loader");
const filterRating = document.getElementById("filterRating");

const db = firebase.database().ref("feedbacks");
const imgbbAPIKey = "3a01fad3d6c23d5bab709c94eae3b9c9";

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
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
  const name = form.name.value;
  const email = form.email.value;
  const message = form.message.value;
  const rating = form.rating.value;
  const imageFile = document.getElementById("imageUpload").files[0];

  loader.style.display = "block";

  if (imageFile) {
    const formData = new FormData();
    formData.append("image", imageFile);

    fetch(`https://api.imgbb.com/1/upload?key=${imgbbAPIKey}`, {
      method: "POST",
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          saveFeedback({
            name,
            email,
            message,
            rating: parseInt(rating),
            imageUrl: data.data.url
          });
        } else {
          loader.style.display = "none";
          alert("Image upload failed.");
        }
      })
      .catch(() => {
        loader.style.display = "none";
        alert("Image upload failed.");
      });
  } else {
    saveFeedback({
      name,
      email,
      message,
      rating: parseInt(rating),
      imageUrl: null
    });
  }
});

function getMoodTag(rating) {
  if (rating >= 5) return "🌟 Loved it!";
  if (rating === 4) return "👍 Good";
  if (rating === 3) return "😐 Okay";
  if (rating <= 2) return "👎 Needs Work";
  return "";
}

function saveFeedback(feedback) {
  feedback.date = new Date().toISOString();
  db.push(feedback);
  form.reset();
  loader.style.display = "none";
  showPopup();
  setTimeout(loadReviews, 500);
}

function loadReviews() {
  db.once("value", snapshot => {
    const data = snapshot.val();
    const entries = Object.values(data || {}).sort((a, b) => new Date(b.date) - new Date(a.date));
    const selectedRating = parseInt(filterRating.value || "0");

    let total = 0, count = 0;
    reviewList.innerHTML = "";

    entries.forEach(({ name, message, rating, imageUrl, date }) => {
      if (selectedRating && rating < selectedRating) return;

      total += rating;
      count++;

      const div = document.createElement("div");
      div.classList.add("review-entry");

      div.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
          <div class="avatar">${name.charAt(0).toUpperCase()}</div>
          <strong>${name}</strong>
        </div>
        <p>${message}</p>
        <p>⭐ ${rating} <span class="mood-tag">${getMoodTag(rating)}</span> <span class="review-time">· ${timeAgo(date)}</span></p>
        ${imageUrl ? `<img src="${imageUrl}" onclick="this.classList.toggle('enlarged')">` : ""}
        <hr>
      `;

      reviewList.appendChild(div);
    });

    averageDisplay.textContent = count ? (total / count).toFixed(1) + " / 5" : "N/A";
  });
}

filterRating.addEventListener("change", loadReviews);
loadReviews();
