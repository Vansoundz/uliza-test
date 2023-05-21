const { spawn } = require('child_process');

function askChatbot(question) {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', ['uliza2.py']);
  
      pythonProcess.stdout.on('data', (data) => {
        // Handle the response from the Python script
        const answer = data.toString().trim();
        resolve(answer);
      });
  
      pythonProcess.stderr.on('data', (error) => {
        // Handle any errors that occur during the Python script execution
        reject(error.toString());
      });
  
      // Send the question to the Python script
      pythonProcess.stdin.write(question + '\n');
      pythonProcess.stdin.end();
    });
  }

askChatbot('who is nakia')
  .then((answer) => {
    console.log('Chatbot answer:', answer);
    // Do something with the answer
  })
  .catch((error) => {
    console.error('Error:', error);
    // Handle the error
  });