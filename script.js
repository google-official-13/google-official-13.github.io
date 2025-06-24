 const form = document.getElementById("feedback-form");
const averageDisplay = document.getElementById("average");
let ratings = JSON.parse(localStorage.getItem("ratings")) || [];

form.addEventListener("submit", function () {
  const rating = form.rating.value;
  if (rating) {
    ratings.push(parseInt(rating));
    localStorage.setItem("ratings", JSON.stringify(ratings));
    updateAverage();
  }
  // Allow Formspree to submit naturally (no preventDefault)
});

function updateAverage() {
  if (ratings.length === 0) {
    averageDisplay.textContent = "N/A";
    return;
  }
  const total = ratings.reduce((a, b) => a + b, 0);
  const avg = (total / ratings.length).toFixed(1);
  averageDisplay.textContent = `${avg} / 5`;
}

updateAverage();
