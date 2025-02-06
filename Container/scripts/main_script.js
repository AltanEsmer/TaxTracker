const quizContainer = document.getElementById('quiz');
const resultsContainer = document.getElementById('results');
const submitButton = document.getElementById('submit');

let quizQuestions = []; // This will store the fetched questions

// Fetch questions from the backend
async function fetchQuestions() {
  try {
    const response = await fetch('http://localhost:8000/api/questions');
    const data = await response.json();
    quizQuestions = data.map(q => ({
      question: q.question,
      answers: {
        a: q.option_a,
        b: q.option_b,
        c: q.option_c
      },
      correctAnswer: q.correct_answer
    }));
    buildQuiz(); // Build the quiz once questions are fetched
  } catch (error) {
    console.error('Error fetching questions:', error);
  }
}

// Build the quiz
function buildQuiz() {
  const output = [];

  quizQuestions.forEach((currentQuestion, questionNumber) => {
    const answers = [];

    for (letter in currentQuestion.answers) {
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

// Show results
function showResults() {
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

// Fetch questions and build the quiz when the page loads
fetchQuestions();

// Event listener for the submit button
submitButton.addEventListener('click', showResults);

document.getElementById("submit").addEventListener("click", () => {
  const totalQuestions = 10; // Adjust this based on your quiz data
  let correctAnswers = 0;

  // Evaluate answers (modify logic based on your quiz implementation)
  const selectedAnswers = document.querySelectorAll("input[type='radio']:checked");
  selectedAnswers.forEach((answer) => {
    if (answer.dataset.correct === "true") {
      correctAnswers++;
    }
  });

  // Save results to localStorage
  localStorage.setItem("totalQuestions", totalQuestions);
  localStorage.setItem("correctAnswers", correctAnswers);

  // Redirect to results page
  window.location.href = "results.html";
});
