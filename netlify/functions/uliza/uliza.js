const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const serverless = require("serverless-http");

// const python = require('./myenv/bin/python3')

// console.log(`${python}`)

const handler = async (event, context) => {
  const app = express();
  app.use(express.json());
  app.use(cors());

  const router = express.Router();

  router.post('/uliza', (req, res) => {
    const question = req.body.userInput;

    const pythonProcess = spawn("python3", ["uliza2.py"]);
    let answer = "";

    pythonProcess.stdout.on("data", (data) => {
      answer += data.toString();
      console.log(data, "data");
      console.log(answer, "answer");
    });

    pythonProcess.stderr.on("error", (error) => {
      console.log({ error });
      res.status(500).json({ error: error.toString() });
    });

    pythonProcess.on("close", () => {
      res.json({ answer: answer.trim() });
    });

    pythonProcess.stdin.write(question + "\n");
    pythonProcess.stdin.end();
  });
  app.use('/.netlify/functions/', router);
console.log("SERVE")
  return serverless(app)(event, context);

};

module.exports = { handler };
