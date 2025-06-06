// Importing required modules / destructuring
const { spawn, exec } = require("child_process");
const express = require("express");
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const path = require("path");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Environment variables
const PORT = process.env.PORT || 3000;

// Serving only the static files inside the folder public
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // Middleware for parsing JSON requests

// Serving login page at start
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get('/predict', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "predict.html"));
});

httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT} (local testing)`);
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("getSymptoms", () => {
        console.log(`Received request for symptoms from ${socket.id}`);
        getSymptoms();
    });

    socket.on('predict', async (symptoms) => {
        console.log("Received symptoms: " + symptoms);

        let result;
        try {
            result = await runPredictInPython(symptoms);
            console.log(result);

            // Emit to the client
            socket.emit("prediction", result);
        } catch (err) {
            console.error(`Error: ${err}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Socket ${socket.id} disconnected.`);
    });

    function getSymptoms() {
        if (symptomsList) {
            socket.emit("symptomsList", symptomsList);
            return;
        }

        if (!modelsTrained) {
            socket.emit("error", "Models not trained yet");
            console.log("Models not trained yet");
            return;
        }

        pythonProcess.stdin.write("get\n");

        pythonProcess.stdout.once("data", (data) => {
            data = String(data).replace(/[\[\]']/g, '');
            symptomsList = data.split(",").map(word => word.trim());

            // Emitting the list to the client/s
            socket.emit("symptomsList", symptomsList);
        });
    }
});

function runPredictInPython(inputData) {
    return new Promise((resolve, reject) => {
        
        pythonProcess.stdin.write(inputData + "\n");

        pythonProcess.stdout.once('data', (data) => {
            try {
                const response = JSON.parse(data.toString());

                if (response.error) {
                    reject(response.error);
                } else {
                    resolve(response);
                }
            } catch (err) {
                reject(err);
            }
        });
    });
}

let pythonProcess;
let symptomsList;
let modelsTrained;

async function startPythonScript() {
    // Running the script
    console.log("Running the Python script...");
    const pythonCommand = process.platform === "win32" ? 'venv\\Scripts\\python' : 'venv/bin/python';
    pythonProcess = spawn(pythonCommand, ['predict.py']);

    pythonProcess.stdout.on('data', (data) => {
        console.log(`Python stdout: ${data}`);
        try {
            const response = JSON.parse(data.toString());
            if (response.models_trained !== undefined) modelsTrained = response.models_trained;
            console.log(modelsTrained);
        } catch (err) {
            console.error(`Error parsing Python stdout: ${err}`);
        }
    });

    pythonProcess.stderr.on("data", (data) => {
        console.error(`Python stderr: ${data}`);
    });

    pythonProcess.on("close", (code) => {
        console.log(`Python script exited with code ${code}`);
    });
}

// Start the script as soon as the server powers up
startPythonScript();
