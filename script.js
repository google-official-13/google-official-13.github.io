// ✅ ImgBB API Integration

const form = document.getElementById("feedback-form");
const averageDisplay = document.getElementById("average");
const reviewList = document.getElementById("review-list");
const db = firebase.database().ref("feedbacks");

const imgbbAPIKey = "3a01fad3d6c23d5bab709c94eae3b9c9"; // your ImgBB API key

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const name = form.name.value;
  const email = form.email.value;
  const message = form.message.value;
  const rating = form.rating.value;
  const imageFile = document.getElementById("imageUpload").files[0];

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
          alert("Image upload failed.");
          console.error("ImgBB response error:", data);
        }
      })
      .catch(err => {
        console.error("Upload error:", err);
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

    averageDisplay.textContent = count
      ? (total / count).toFixed(1) + " / 5"
      : "N/A";
  });
}

loadReviews();
