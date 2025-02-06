import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-fMfJLzeiAQWhubnnLsmBA2RW8JWLWKM",
  authDomain: "quizapp-465fa.firebaseapp.com",
  projectId: "quizapp-465fa",
  storageBucket: "quizapp-465fa.appspot.com",
  messagingSenderId: "888365017850",
  appId: "1:888365017850:web:89f6ad2c989a18b329b743",
  measurementId: "G-E43XYSWJGZ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Google Sign-In
document.getElementById("cta-button").addEventListener("click", () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then((result) => {
      console.log("User signed in:", result.user);
      window.location.href = "./Pages/main.html";
    })
    .catch((error) => {
      console.error("Error signing in:", error);
    });
});

// Sign-Out
document.getElementById("sign-out-button").addEventListener("click", () => {
  signOut(auth).then(() => {
    console.log("User signed out");
    window.location.reload();
  });
});

// Check authentication state
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User is authenticated:", user);
    document.getElementById("sign-out-button").style.display = "block";
  } else {
    console.log("User is not authenticated.");
    document.getElementById("sign-out-button").style.display = "none";
  }
});

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    const userName = user.displayName || "Quiz Master"; // Default if no name is set
    console.log("User Name:", userName);

    // Save the user's name in localStorage for the results page
    localStorage.setItem("userName", userName);
  } else {
    // User is not signed in
    console.log("No user is signed in.");
  }
});