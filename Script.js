// --- Quiz State Variables ---
let questions = [];     // Master list of all questions (from JSON)
let activeQuestions = []; // Questions currently in the main quiz flow (correctly answered questions are removed)
let retryQuestions = []; // Questions answered incorrectly (25% chance of re-ask)
let currentQuestion = null; // The actual question object being displayed
let score = 0;          // Tracks the player's score
let questionCount = 0;  // Tracks the total number of attempts/questions asked

// --- New State for Repetition Prevention ---
let lastAskedQuestion = null;    // Stores the question object from the previous round
let wasLastAnswerCorrect = false; // Tracks if the previous answer was correct

// --- DOM Element References ---
const questionElement = document.getElementById("question");
const answerButtonsElement = document.getElementById("answers");
const nextButton = document.getElementById("next-btn");

// --- 1. Load Questions from JSON ---

async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Fix: Flatten the object structure (topic keys) into a single 'questions' array
        for (const topic in data) {
            if (Array.isArray(data[topic])) {
                questions = questions.concat(data[topic]);
            }
        }
        
        console.log("Total questions loaded:", questions.length);
        console.log("Starting Quiz with retry logic...");
        
        startQuiz(); 
        
    } catch (error) {
        console.error("Could not load quiz data:", error);
        questionElement.innerHTML = 'Error loading quiz data. Check the console for details.';
    }
}

// --- 2. Quiz Flow Functions ---

function startQuiz() {
    score = 0;
    questionCount = 0;
    retryQuestions = []; 
    
    // Reset state for question prevention
    lastAskedQuestion = null; 
    wasLastAnswerCorrect = false;
    
    // Reset activeQuestions by copying and shuffling the master list
    activeQuestions = [...questions]; 
    shuffleQuestions(activeQuestions);

    nextButton.style.display = 'none'; 
    nextButton.innerHTML = "Next"; // Reset button text
    
    // Remove old event listener to prevent duplicate triggers
    nextButton.removeEventListener("click", startQuiz);
    nextButton.addEventListener("click", handleNextButton);

    // Initial call to select and display the first question
    setNextQuestion();
}

// Function to shuffle the order of questions
function shuffleQuestions(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// --- CORE LOGIC: Determines which question is asked next ---
function setNextQuestion() {
    resetState();
    questionCount++; // Increment the total number of questions asked

    let nextQuestion = null;
    let attempts = 0; // Safety counter to prevent infinite loops in small pools

    while (attempts < 5) {
        attempts++;
        
        let poolSource = 'ACTIVE';
        nextQuestion = null;
        
        // 1. 25% chance to draw from the retry pool
        const useRetry = retryQuestions.length > 0 && Math.random() < 0.25;

        if (useRetry) {
            const randomIndex = Math.floor(Math.random() * retryQuestions.length);
            nextQuestion = retryQuestions[randomIndex];
            poolSource = 'RETRY';
        } 
        
        // 2. If no retry question was picked, or the retry pool was empty, draw from the main active pool
        if (!nextQuestion && activeQuestions.length > 0) {
            // Peek at the next question (always index 0 since it's shuffled)
            nextQuestion = activeQuestions[0]; 
            poolSource = 'ACTIVE';
        }

        // 3. Check for End Condition
        if (!nextQuestion) {
            // Both pools are empty, finish quiz
            if (attempts === 1) showScore();
            return;
        }

        // 4. Check Repetition Constraint (NEW LOGIC)
        // Only enforce the constraint if the last answer was correct
        if (wasLastAnswerCorrect && nextQuestion === lastAskedQuestion) {
            console.log(`Question #${questionCount}: REPEATED question avoided.`);
            
            // If the question came from the active pool, move it to the back 
            // and try again to get the new front element.
            if (poolSource === 'ACTIVE' && activeQuestions.length > 1) {
                const repeatedQuestion = activeQuestions.shift();
                activeQuestions.push(repeatedQuestion);
            }
            
            // For the retry pool (or active pool if only one left), we just continue the loop
            // to try another random draw or accept the repetition if no other choice exists.
            continue; // Go back to the start of the while loop
        }
        
        // 5. Valid question found (or unavoidable repeat)
        
        // Final action: Remove the question if it came from the ACTIVE pool
        if (poolSource === 'ACTIVE') {
            activeQuestions.shift(); 
        }
        
        currentQuestion = nextQuestion;
        displayQuestion();
        return; // Exit the function with the selected question
    }
    
    // Fallback: If loop fails (very unlikely), just show the question.
    currentQuestion = nextQuestion;
    displayQuestion();
}


function displayQuestion() {
    // The question number is now based on the total count of questions asked
    const questionNo = questionCount; 
    
    // 1. Display the question text
    questionElement.innerText = `${questionNo}. ${currentQuestion.question}`;
    
    // 2. Get the choices: use 'choices' array if it exists, otherwise use default True/False
    let choices = currentQuestion.choices || (currentQuestion.type === 'truefalse' ? ["True", "False"] : []);

    // 3. Create a button for each choice
    choices.forEach(choice => {
        const button = document.createElement("button");
        button.innerHTML = choice; 
        
        // Use Tailwind classes for styling (from quiz.html)
        button.classList.add("answer-btn", "p-3", "bg-white", "rounded-lg", "shadow-md", "hover:bg-gray-100", "transition", "duration-150");
        
        // Store correctness in a data attribute
        if (choice === currentQuestion.answer) {
            button.dataset.correct = true; 
        }
        
        // Attach the click event listener
        button.addEventListener("click", selectAnswer);
        
        answerButtonsElement.appendChild(button);
    });
}

// Function to clear answer buttons and hide the Next button
function resetState() {
    nextButton.style.display = 'none';
    while (answerButtonsElement.firstChild) {
        answerButtonsElement.removeChild(answerButtonsElement.firstChild);
    }
}

function selectAnswer(e) {
    // Prevent double clicking
    if (nextButton.style.display === 'block') return;
    
    const selectedBtn = e.target;
    const isCorrect = selectedBtn.dataset.correct === "true";

    // --- New State Tracking ---
    wasLastAnswerCorrect = isCorrect;
    lastAskedQuestion = currentQuestion;
    // ---------------------------

    // 1. Check answer and update score/styling
    if (isCorrect) {
        selectedBtn.classList.add("bg-green-500", "text-white", "hover:bg-green-600");
        score++;
        
        // If this was a retry question, remove it from the retry pool as it's now correct
        const retryIndex = retryQuestions.indexOf(currentQuestion);
        if (retryIndex > -1) {
            retryQuestions.splice(retryIndex, 1);
            console.log("Retry question answered correctly and removed from pool.");
        }

    } else {
        selectedBtn.classList.add("bg-red-500", "text-white", "hover:bg-red-600");
        
        // If the question was incorrect AND is not already in the retry list, add it
        if (retryQuestions.indexOf(currentQuestion) === -1) {
            retryQuestions.push(currentQuestion);
            console.log("Question answered incorrectly, added to retry pool.");
        }
    }

    // 2. Disable all buttons after a selection
    Array.from(answerButtonsElement.children).forEach(button => {
        // Highlight the correct answer
        if (button.dataset.correct === "true") {
            button.classList.add("bg-green-500", "text-white");
        }
        button.disabled = true;
    });

    // 3. Show the Next button
    nextButton.style.display = 'block';
    
    // Check if "Next" should be "Show Score"
    if (activeQuestions.length === 0 && retryQuestions.length === 0) {
        nextButton.innerHTML = "Show Score";
    }
}

function handleNextButton() {
    // Check if the quiz is truly finished (both lists are empty)
    if (activeQuestions.length === 0 && retryQuestions.length === 0) {
        showScore();
    } else {
        setNextQuestion();
    }
}

function showScore() {
    resetState();
    // The final score is based on questions.length (total unique questions)
    questionElement.innerHTML = `Quiz Complete! You scored ${score} out of ${questions.length} total questions, over ${questionCount} attempts.`;
    
    // Change the "Next" button text to "Play Again" and set up the restart function
    nextButton.innerHTML = "Play Again";
    nextButton.style.display = "block";
    
    // Remove the old listener and add a new one for starting the quiz again
    nextButton.removeEventListener("click", handleNextButton);
    nextButton.addEventListener("click", startQuiz);
}

// --- 3. Initial Setup ---

loadQuestions();
