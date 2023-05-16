const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

app.post('/askChatbot', (req, res) => {
  const question  = req.body.userInput;
  const pythonProcess = spawn('python3', ['uliza2.py']);
  let answer = '';

  pythonProcess.stdout.on('data', (data) => {
    answer += data.toString();
    console.log(data, 'data');
    console.log(answer, 'answer')
  });

  pythonProcess.stderr.on('data', (error) => {
    res.status(500).json({ error: error.toString() });
  });

  pythonProcess.on('close', () => {
    res.json({ answer: answer.trim() });
  });

  pythonProcess.stdin.write(question + '\n');
  pythonProcess.stdin.end();
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});