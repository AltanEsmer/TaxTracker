const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 8000;

app.use(bodyParser.json());
app.use(cors());

// Create MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'altan2005',
  database: 'quiz_db'
});

// Connect to MySQL
db.connect((err) => {
  if (err) throw err;
  console.log('MySQL Connected...');
});

// Drop the existing questions table (if exists) to start fresh
db.query('DROP TABLE IF EXISTS questions', (err) => {
  if (err) throw err;
  console.log('Existing table dropped (if it existed)');
});

// Create table for questions
db.query(`CREATE TABLE questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(255) UNIQUE,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  correct_answer CHAR(1)
)`, (err) => {
  if (err) throw err;
  console.log('Questions table created');
});

// Sample questions
const sampleQuestions = [
  {
    question: 'What is the capital of France?',
    option_a: 'Paris',
    option_b: 'London',
    option_c: 'Berlin',
    correct_answer: 'a'
  },
  {
    question: 'What is 2 + 2?',
    option_a: '3',
    option_b: '4',
    option_c: '5',
    correct_answer: 'b'
  }
];

// Insert unique sample questions
sampleQuestions.forEach((q) => {
  const sql = `
    INSERT INTO questions (question, option_a, option_b, option_c, correct_answer)
    SELECT ?, ?, ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM questions WHERE question = ?
    )
  `;
  db.query(sql, [q.question, q.option_a, q.option_b, q.option_c, q.correct_answer, q.question], (err) => {
    if (err) {
      console.error(`Error inserting question "${q.question}":`, err);
    } else {
      console.log(`Inserted question: "${q.question}"`);
    }
  });
});

// API to fetch questions
app.get('/api/questions', (req, res) => {
  const sql = 'SELECT * FROM questions';
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
