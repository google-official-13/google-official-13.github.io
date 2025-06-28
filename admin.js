// admin.js
const allowedAdmins = [
  "ritikbhalwala1@gmail.com",
  "malvifenil0@gmail.com"
];

document.getElementById("loginBtn").addEventListener("click", function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const userEmail = userCredential.user.email;
      if (allowedAdmins.includes(userEmail)) {
        alert("Login successful! Redirecting...");
        window.location.href = "admin-dashboard.html";
      } else {
        alert("Access denied: You are not an admin.");
        firebase.auth().signOut();
      }
    })
    .catch((error) => {
      alert("Login failed: " + error.message);
    });
});
