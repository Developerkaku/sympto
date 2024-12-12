// Establish a connection to the backend
const socket = io();

let symptomsList = [];

// Request symptoms from the backend when the page loads
let getSymptomsInterval = setInterval(() => {
    if (symptomsList.length > 0) clearInterval(getSymptomsInterval);
    socket.emit('getSymptoms');
}, 5000);

// Receive the symptoms list and store them dynamically
socket.on('symptomsList', function (symptoms) {
    // Update the global symptoms list
    //convert the symptoms to lower case for easier comparision
    symptomsList = symptoms.map(symptom => symptom.toLowerCase());
    console.log("Symptoms received from backend:", symptomsList);
});

socket.on('error', () => {
    const messagesDiv = document.querySelector('.messages');
    const responseMessage = document.createElement('div');
    responseMessage.classList.add('message', 'response-message');
    responseMessage.textContent = "Error occured at backend ,Please try again after sometime!";
    messagesDiv.appendChild(responseMessage);
    messagesDiv.classList.add('show');
});

// Welcome Message
document.addEventListener('DOMContentLoaded', function () {
    const userName = localStorage.getItem('userName');
    const messagesDiv = document.querySelector('.messages');

    if (userName) {
        // Display a welcome message
        const welcomeMessage = document.createElement('div');
        welcomeMessage.classList.add('message', 'response-message');
        welcomeMessage.textContent = `Welcome, ${userName}!`;
        messagesDiv.appendChild(welcomeMessage);
        messagesDiv.classList.add('show');
    } else {
        // Redirect to login if no user data is found
        alert("No user data found. Redirecting to login.");
        window.location.href = '/';
    }
});

document.getElementById('submit').addEventListener('click', function () {
    const inputElem = document.getElementById('input');
    const input = inputElem.value;

    if (input.trim() !== "") {
        const messagesDiv = document.querySelector('.messages');

        // User message
        const userMessage = document.createElement('div');
        userMessage.classList.add('message', 'user-message');
        userMessage.textContent = input;
        messagesDiv.appendChild(userMessage);

        // Identify symptoms
        lowerCaseInput = input.toLowerCase();
        const symptoms = identifySymptoms(lowerCaseInput);

        if (symptoms.length > 0) {
            socket.emit("predict", symptoms);
        } else {
            let errMsg = (symptomsList.length === 0) ? "Error occured at the server, please try again." : "No symptoms identified!";
            const responseMessage = document.createElement('div');
            responseMessage.classList.add('message', 'response-message');
            responseMessage.textContent = errMsg;
            messagesDiv.appendChild(responseMessage);
            messagesDiv.classList.add('show');
        }

        // Clear the input field
        inputElem.value = "";

        // Scroll to the bottom of the messages
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } else {
        const messagesDiv = document.querySelector('.messages');
        const responseMessage = document.createElement('div');
        responseMessage.classList.add('message', 'response-message');
        responseMessage.textContent = "No input given, please enter any symptom!";
        messagesDiv.appendChild(responseMessage);

        messagesDiv.classList.add('show');
        inputElem.value = ""; // Clear the input field

        // Scroll to the bottom of the messages
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
});

socket.on("prediction", (response) => {
    const messagesDiv = document.querySelector('.messages');
    const predictionMessageText = response.prediction; // Contains string "prediction"

    // Response message
    const responseMessage = document.createElement('div');
    responseMessage.classList.add('message', 'response-message');
    responseMessage.textContent = predictionMessageText;
    messagesDiv.appendChild(responseMessage);
    messagesDiv.classList.add('show');

    if (response.warning) {
        const warningMessageText = "WARNING:\n"+response.warning; // Contains string "warning"

        // Response message
        const errorMessage = document.createElement('div');
        errorMessage.classList.add('message', 'response-message');
        errorMessage.textContent = warningMessageText;
        messagesDiv.appendChild(errorMessage);
        messagesDiv.classList.add('show');
    }

    // Scroll to the bottom of the messages
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

function identifySymptoms(text) {
    const nlp = window.nlp; // Ensure Compromise.js is loaded
    const doc = nlp(text);

    const identifiedSymptoms = [];

    // Check if any symptoms are mentioned in the text
    symptomsList.forEach(symptom => {
        if (doc.has(symptom)) {
            identifiedSymptoms.push(symptom);
        }
    });

    return identifiedSymptoms;
}

// Select the .messages container and the overlay
const messagesContainer = document.querySelector('.messages');
const messagesOverlay = document.querySelector('.messages-overlay');

// Function to update overlay height dynamically
function updateOverlayHeight() {
    const totalHeight = messagesContainer.scrollHeight; // Total content height
    messagesOverlay.style.height = `${totalHeight}px`;
}

// Attach event listeners to update the height on content or scroll changes
messagesContainer.addEventListener('input', updateOverlayHeight);
messagesContainer.addEventListener('scroll', updateOverlayHeight);

// Initial height setup
updateOverlayHeight();

const clearButton = document.querySelector('.clear');
const signOutButton = document.querySelector('.signOut');

clearButton.addEventListener('click', function () {
    const messagesDiv = document.querySelector('.messages');
    const overlay = document.querySelector('.messages-overlay');
    while (messagesDiv.firstChild) {
        messagesDiv.removeChild(messagesDiv.firstChild);
    }
    messagesDiv.appendChild(overlay); // Re-add the overlay to messagesDiv 
    messagesDiv.classList.remove('show');
});

signOutButton.addEventListener('click', function () {
    localStorage.clear();
    location.reload();
});

document.addEventListener('keydown', function (event) {
    if (event.key == "Enter") {
        document.getElementById("submit").click();
    }
    const inputElem = document.getElementById('input');
    if (!inputElem.matches(':focus')) {
        inputElem.focus();
    }
});

