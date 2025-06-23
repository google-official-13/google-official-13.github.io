 document.getElementById("feedback-form").addEventListener("submit", function (e) {
  e.preventDefault();

  const form = e.target;
  const data = new FormData(form);

  fetch(form.action, {
    method: form.method,
    body: data,
    headers: {
      'Accept': 'application/json'
    }
  }).then(response => {
    if (response.ok) {
      alert("🎉 Thank you for your feedback!");
      form.reset();
      document.getElementById("average").textContent = "Submitted";
    } else {
      alert("❌ Oops! Something went wrong. Please try again.");
    }
  }).catch(error => {
    alert("❌ Network error. Please try again.");
    console.error(error);
  });
});
