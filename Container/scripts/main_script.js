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
