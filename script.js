const form = document.getElementById("feedback-form");
const averageDisplay = document.getElementById("average");
const reviewList = document.getElementById("review-list");
const db = firebase.database().ref("feedbacks");

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const name = form.name.value;
  const email = form.email.value;
  const message = form.message.value;
  const rating = form.rating.value;

  const feedback = { name, email, message, rating: parseInt(rating), date: new Date().toISOString() };
  db.push(feedback); // save to Firebase

  form.reset(); // clear form
  alert("Feedback submitted!");

  setTimeout(loadReviews, 500); // refresh reviews after submit
});

// Load reviews and calculate average
function loadReviews() {
  db.once("value", snapshot => {
    const data = snapshot.val();
    let total = 0, count = 0;
    reviewList.innerHTML = "";

    for (let key in data) {
      const { name, message, rating } = data[key];
      total += rating;
      count++;

      const div = document.createElement("div");
      div.innerHTML = `<p><strong>${name}</strong>: ${message} <br>⭐ ${rating}</p><hr>`;
      reviewList.appendChild(div);
    }

    averageDisplay.textContent = count ? (total / count).toFixed(1) + " / 5" : "N/A";
  });
}

loadReviews(); // Load when page starts
