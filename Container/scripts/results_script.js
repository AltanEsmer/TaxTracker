// Retrieve data from localStorage
const totalQuestions = localStorage.getItem("totalQuestions") || 0;
const correctAnswers = localStorage.getItem("correctAnswers") || 0;
const userName = localStorage.getItem("userName") || "Quiz Master"; // Assuming the name is stored

// Calculate grade percentage
const grade = ((correctAnswers / totalQuestions) * 100).toFixed(2);

// Display results in the HTML
document.getElementById("total-questions").textContent = totalQuestions;
document.getElementById("correct-answers").textContent = correctAnswers;
document.getElementById("grade").textContent = `${grade}%`;
document.getElementById("user-name").textContent = userName;

// Funny messages based on the grade
let funnyMessage = "";
if (grade >= 90) {
  funnyMessage = "You're a genius! 🎓";
} else if (grade >= 70) {
  funnyMessage = "Great job! Keep it up! 👍";
} else if (grade >= 50) {
  funnyMessage = "Not bad! A little more practice and you'll ace it. 😉";
} else {
  funnyMessage = "Oops! Maybe next time! 😅";
}
document.getElementById("funny-message").textContent = funnyMessage;

// Create the Chart.js bar chart
const ctx = document.getElementById("results-chart").getContext("2d");
const chart = new Chart(ctx, {
  type: "bar",
  data: {
    labels: ["Correct Answers", "Incorrect Answers"],
    datasets: [
      {
        label: "Quiz Results",
        data: [correctAnswers, totalQuestions - correctAnswers],
        backgroundColor: ["#4caf50", "#ff6b6b"],
        borderColor: ["#388e3c", "#e53935"],
        borderWidth: 1,
      },
    ],
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  },
});
