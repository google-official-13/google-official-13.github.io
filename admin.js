// admin.js

// ✅ Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCUyWy3A6FV4NwobM5abPoZ06kn2cQw-9c",
  authDomain: "fast-food-feedback.firebaseapp.com",
  databaseURL: "https://fast-food-feedback-default-rtdb.firebaseio.com",
  projectId: "fast-food-feedback",
  storageBucket: "fast-food-feedback.appspot.com",
  messagingSenderId: "347264169976",
  appId: "1:347264169976:web:14a7012e792b2582a90145"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

const allowedAdmins = [
  "ritikbhalwala1@gmail.com",
  "malvifenil0@gmail.com"
];

// ✅ Login logic
document.getElementById("login-btn").addEventListener("click", () => {
  const email = document.getElementById("admin-email-input").value;
  const password = document.getElementById("admin-password-input").value;
  const errorBox = document.getElementById("login-error");

  if (!email || !password) {
    errorBox.innerText = "Please enter both email and password.";
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const userEmail = userCredential.user.email;

      if (!allowedAdmins.includes(userEmail)) {
        auth.signOut();
        errorBox.innerText = "Unauthorized access. Not an admin.";
        return;
      }

      // ✅ Hide login section & show dashboard
      document.getElementById("login-section").style.display = "none";
      document.querySelector(".admin-layout").style.display = "flex";
      document.getElementById("logged-email").innerText = userEmail;

      loadDashboard(); // Call your dashboard logic here

    })
    .catch((error) => {
      console.error(error);
      errorBox.innerText = "Invalid email or password.";
    });
});

// ✅ Logout button
document.getElementById("logout-btn").addEventListener("click", () => {
  auth.signOut().then(() => location.reload());
});

// ✅ Dummy placeholder: You can add your dashboard load logic
function loadDashboard() {
  document.getElementById("total-reviews").innerText = "Loading...";
  document.getElementById("average-rating").innerText = "Loading...";

  // You can fetch actual feedback here from Firebase database if needed
}
