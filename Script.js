// Step 1: Define a variable to hold your question data
let questions = [];

// Step 2: Use the 'fetch' API to load the JSON file
async function loadQuestions() {
    try {
        // 'await' waits for the data to be retrieved from the questions.json file
        const response = await fetch('questions.json');
        
        // Check if the file was found and the request was successful
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // 'await' waits for the response to be parsed into a JavaScript object (an array)
        const data = await response.json();
        
        // Assign the loaded data to our global questions array
        questions = data; 
        
        console.log("Questions loaded successfully:", questions);
        
        // *** This is where we will call the function to start the quiz later ***
        startQuiz(); 
        
    } catch (error) {
        // Display an error if the file couldn't be loaded
        console.error("Could not load questions:", error);
        document.getElementById('question').innerHTML = 'Error loading quiz data.';
    }
}

// A simple placeholder function for now (we'll fill this out next)
function startQuiz() {
    // For now, let's just confirm we loaded a question by displaying the first one's text
    if (questions.length > 0) {
        document.getElementById('question').innerText = questions[0].question;
    } else {
        document.getElementById('question').innerText = "No questions found in the file.";
    }
}

// Call the function to begin loading the questions when the script runs
loadQuestions();
