// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

const quizContainer = document.getElementById('quiz');
const resultsContainer = document.getElementById('results');
const submitButton = document.getElementById('submit');

fetch('http://localhost:8000/api/questions')
  .then(response => response.json())
  .then(data => {
    const quizQuestions = data.map(q => ({
      question: q.question,
      answers: { a: q.option_a, b: q.option_b, c: q.option_c },
      correctAnswer: q.correct_answer
    }));

    buildQuiz(quizQuestions); // Pass quizQuestions to the function
    submitButton.addEventListener('click', () => showResults(quizQuestions)); // Pass quizQuestions
  })
  .catch(error => console.error("Error fetching questions:", error));

function buildQuiz(quizQuestions) {
  const output = [];

  quizQuestions.forEach((currentQuestion, questionNumber) => {
    const answers = [];

    for (let letter in currentQuestion.answers) {
      answers.push(
        `<label>
          <input type="radio" name="question${questionNumber}" value="${letter}">
          ${letter} :
          ${currentQuestion.answers[letter]}
        </label>`
      );
    }

    output.push(
      `<div class="question"> ${currentQuestion.question} </div>
      <div class="answers"> ${answers.join('')} </div>`
    );
  });

  quizContainer.innerHTML = output.join('');
}

function showResults(quizQuestions) {
  const answerContainers = quizContainer.querySelectorAll('.answers');
  let numCorrect = 0;

  quizQuestions.forEach((currentQuestion, questionNumber) => {
    const answerContainer = answerContainers[questionNumber];
    const selector = `input[name=question${questionNumber}]:checked`;
    const userAnswer = (answerContainer.querySelector(selector) || {}).value;

    if (userAnswer === currentQuestion.correctAnswer) {
      numCorrect++;
      answerContainers[questionNumber].style.color = 'green';
    } else {
      answerContainers[questionNumber].style.color = 'red';
    }
  });

  resultsContainer.innerHTML = `${numCorrect} out of ${quizQuestions.length}`;
}

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC-fMfJLzeiAQWhubnnLsmBA2RW8JWLWKM",
  authDomain: "quizapp-465fa.firebaseapp.com",
  projectId: "quizapp-465fa",
  storageBucket: "quizapp-465fa.firebasestorage.app",
  messagingSenderId: "888365017850",
  appId: "1:888365017850:web:89f6ad2c989a18b329b743",
  measurementId: "G-E43XYSWJGZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Google Sign-In
document.getElementById('cta-button').addEventListener('click', () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then((result) => {
      // User signed in successfully
      const user = result.user;
      console.log('User signed in:', user);
      // Redirect to the main page
      window.location.href = '/main.html';
    })
    .catch((error) => {
      console.error('Error signing in:', error);
    });
});

// Check authentication state
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('User is authenticated:', user);
    // Show the sign-out button
    document.getElementById('sign-out-button').style.display = 'block';
  } else {
    console.log('User is not authenticated.');
    // Hide the sign-out button
    document.getElementById('sign-out-button').style.display = 'none';
  }
});