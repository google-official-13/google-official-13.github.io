const form = document.getElementById("feedback-form");
const averageDisplay = document.getElementById("average");
const reviewList = document.getElementById("review-list");
const db = firebase.database().ref("feedbacks");
const storage = firebase.storage().ref("review-images");

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const name = form.name.value;
  const email = form.email.value;
  const message = form.message.value;
  const rating = form.rating.value;
  const imageFile = document.getElementById("imageUpload").files[0];

  if (!name || !email || !message || !rating) {
    alert("Please fill all fields.");
    return;
  }

  if (imageFile) {
    if (imageFile.size > 5 * 1024 * 1024) {
      alert("Image too large. Please upload under 5MB.");
      return;
    }

    alert("Uploading image...");
    const filePath = Date.now() + "_" + imageFile.name;
    const uploadTask = storage.child(filePath).put(imageFile);

    uploadTask.then(snapshot => snapshot.ref.getDownloadURL())
      .then(imageUrl => {
        saveFeedback({ name, email, message, rating: parseInt(rating), imageUrl });
      })
      .catch(error => {
        alert("Image upload failed. Submitting without image.");
        console.error(error);
        saveFeedback({ name, email, message, rating: parseInt(rating), imageUrl: null });
      });
  } else {
    saveFeedback({ name, email, message, rating: parseInt(rating), imageUrl: null });
  }
});

function saveFeedback(feedback) {
  feedback.date = new Date().toISOString();
  db.push(feedback);
  form.reset();
  alert("Feedback submitted!");
  setTimeout(loadReviews, 500);
}

function loadReviews() {
  db.once("value", snapshot => {
    const data = snapshot.val();
    let total = 0, count = 0;
    reviewList.innerHTML = "";

    for (let key in data) {
      const { name, message, rating, imageUrl } = data[key];
      total += rating;
      count++;

      const div = document.createElement("div");
      div.innerHTML = `
        <p><strong>${name}</strong>: ${message} <br>⭐ ${rating}</p>
        ${imageUrl ? `<img src="${imageUrl}" alt="Review Image" style="max-width:100%; border-radius:10px; margin:10px 0;">` : ""}
        <hr>
      `;
      reviewList.appendChild(div);
    }

    averageDisplay.textContent = count ? (total / count).toFixed(1) + " / 5" : "N/A";
  });
}

loadReviews();
