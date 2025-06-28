const auth = firebase.auth();

const allowedAdmins = [
  "ritikbhalwala1@gmail.com",
  "malvifenil0@gmail.com"
];

const googleSignInBtn = document.getElementById("googleSignInBtn");
const passwordSection = document.getElementById("passwordSection");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const loginMessage = document.getElementById("loginMessage");

let googleEmail = "";

// Step 1: Google Sign-In
googleSignInBtn.addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => {
      googleEmail = result.user.email;
      if (allowedAdmins.includes(googleEmail)) {
        loginMessage.textContent = "Google sign-in verified. Now enter admin password.";
        passwordSection.style.display = "block";
      } else {
        loginMessage.textContent = "Access denied: This Google account is not allowed.";
        auth.signOut();
      }
    })
    .catch((error) => {
      loginMessage.textContent = "Google sign-in failed.";
      console.error(error);
    });
});

// Step 2: Password Check
adminLoginBtn.addEventListener("click", () => {
  const email = document.getElementById("adminEmail").value;
  const password = document.getElementById("adminPassword").value;

  if (email === googleEmail && allowedAdmins.includes(email) && password === "ritik2006") {
    loginMessage.textContent = "Login successful. Redirecting...";
    setTimeout(() => {
      window.location.href = "admin-dashboard.html";
    }, 1000);
  } else {
    loginMessage.textContent = "Invalid email or password.";
  }
});
