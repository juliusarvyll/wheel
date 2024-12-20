const WHEEL_RADIUS = 400;
const TEXT_FONT_SIZE = 50;
const WINNERS_KEY = 'wheelWinners';
const MEMBERS_KEY = 'wheelMembers';

// Create new wheel object specifying the parameters at creation time.
let theWheel = new Winwheel({
    'numSegments': 11,     // Specify number of segments.
    'outerRadius': WHEEL_RADIUS,   // Set outer radius so wheel fits inside the background.
    'textFontSize': TEXT_FONT_SIZE,    // Set font size as desired.

    'animation':           // Specify the animation to use.
    {
        'type': 'spinToStop',
        'duration': 15,
        'spins': 8,
        'callbackFinished': alertPrize,
    }
});

function randomizeSegments() {
    // Google Sheets URL - replace with your sheet's ID and sheet name
    const SHEET_ID = '1unWYe7i9onPnHwMla9D2basSm1i5xOBcZvln-jiVtEk';
    const SHEET_NAME = 'Form Responses 1';
    const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

    // Fetch the Google Sheet data
    fetch(SHEET_URL)
        .then(response => response.text())
        .then(data => {
            // Google's response comes with extra characters that need to be removed
            const jsonData = JSON.parse(data.substring(47).slice(0, -2));
            
            // Get previous winners
            const winners = JSON.parse(localStorage.getItem(WINNERS_KEY) || '[]');
            const winnerNames = winners.map(winner => winner.name);
            
            // Extract names from the parsed data, excluding previous winners
            const names = jsonData.table.rows
                .map(row => row.c[1].v)  // Changed from [0] to [1] to get the name column
                .filter(name => name && name.length > 0 && !winnerNames.includes(name));

            // Create segments from remaining names
            const segments = names.map(name => ({
                fillStyle: '#' + Math.floor(Math.random() * 16777215).toString(16),
                text: name,
                id: Math.floor(Math.random() * Date.now())
            }));

            // Update wheel configuration
            theWheel = new Winwheel({
                'numSegments': segments.length,
                'outerRadius': WHEEL_RADIUS,
                'textFontSize': calculateFontSize(segments.length),
                'textOrientation': 'horizontal',
                'textAlignment': 'center',
                'segments': segments.sort(() => Math.random() - 0.5),
                'animation': {
                    'type': 'spinToStop',
                    'duration': 15,
                    'spins': 8,
                    'callbackFinished': alertPrize,
                }
            });

            // Update nameList for the sidebar
            nameList = theWheel.segments
                .filter(segment => segment != null)
                .sort((a, b) => sortNames(a, b));

            // Clear and re-render the names in the sidebar
            const namesList = document.querySelector('.js-name-list');
            namesList.innerHTML = '';
            nameList.forEach(name => renderNames(name));

            // Save to localStorage
            localStorage.setItem(MEMBERS_KEY, JSON.stringify(nameList));
        })
        .catch(error => console.error('Error fetching sheet data:', error));
}

// Call randomizeSegments when the page loads
document.addEventListener('DOMContentLoaded', () => {
    randomizeSegments();

    // Add reset button to your HTML
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset All Members';
    resetButton.className = 'reset-all-btn';
    resetButton.onclick = resetAllMembers;
    
    // Find an existing container or create one if needed
    let controlsContainer = document.querySelector('.controls-container');
    if (!controlsContainer) {
        controlsContainer = document.createElement('div');
        controlsContainer.className = 'controls-container';
        document.body.appendChild(controlsContainer);
    }
    controlsContainer.appendChild(resetButton);

    // Initial display of winners
    displayWinners();
});

// -------------------------------------------------------
// Called when the spin animation has finished by the callback feature of the wheel because I specified callback in the parameters
// note the indicated segment is passed in as a parmeter as 99% of the time you will want to know this to inform the user of their prize.
// -------------------------------------------------------
function alertPrize(indicatedSegment) {
    // Initialize JSConfetti
    const jsConfetti = new JSConfetti();

    // Stop the spinning sound
    const spinSound = document.getElementById('spinSound');
    spinSound.pause();
    spinSound.currentTime = 0;

    // Get the modal elements
    const modal = document.getElementById('winnerModal');
    const winnerText = document.getElementById('winnerText');
    const prizeText = document.getElementById('prizeText');
    const closeBtn = modal.querySelector('.close');
    const prizeInput = document.getElementById('prizeInput');
    const prize = prizeInput.value.trim();

    // Set the winner and prize text
    winnerText.textContent = `The winner is: ${indicatedSegment.text}`;
    prizeText.textContent = `Prize: ${prize}`;

    // Show the modal and trigger confetti
    modal.style.display = "block";
    jsConfetti.addConfetti({
        emojis: ['🎉', '🎊', '✨', '⭐', '🌟'],
        emojiSize: 70,
        confettiNumber: 500,
    });

    // Save winner immediately
    const winners = JSON.parse(localStorage.getItem(WINNERS_KEY) || '[]');
    winners.push({
        name: indicatedSegment.text,
        prize: prize,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem(WINNERS_KEY, JSON.stringify(winners));

    // Remove winner from nameList
    const winnerIndex = nameList.findIndex(item => item.text === indicatedSegment.text);
    if (winnerIndex > -1) {
        nameList.splice(winnerIndex, 1);
        localStorage.setItem(MEMBERS_KEY, JSON.stringify(nameList));
        renderWheel();
    }

    // Update display
    displayWinners();
}

// =======================================================================================================================
// Code below for the power controls etc which is entirely optional. You can spin the wheel simply by
// calling theWheel.startAnimation();
// =======================================================================================================================
let wheelPower = 2;
let wheelSpinning = false;

// -------------------------------------------------------
// Click handler for spin button.
// -------------------------------------------------------
function startSpin() {
    const prizeInput = document.getElementById('prizeInput');
    
    // Check if prize is entered
    if (!prizeInput.value.trim()) {
        alert('Please enter a prize before spinning!');
        prizeInput.focus();
        return;
    }

    // Ensure that spinning can't be clicked again while already running.
    if (wheelSpinning == false) {
        // Play the spin sound
        const spinSound = document.getElementById('spinSound');
        spinSound.currentTime = 0;  // Reset audio to start
        spinSound.play();

        // Begin the spin animation by calling startAnimation on the wheel object.
        theWheel.startAnimation();

        // Set to true so that power can't be changed and spin button re-enabled during
        // the current animation. The user will have to reset before spinning again.
        wheelSpinning = true;
    }
}

// Add event listener for Enter key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        const prizeInput = document.getElementById('prizeInput');
        if (document.activeElement !== prizeInput) { // Only trigger spin if we're not typing in the prize input
            startSpin();
        }
    }
});

// -------------------------------------------------------
// Function for reset button.
// -------------------------------------------------------
function resetWheel() {
    // Stop the spinning sound if it's still playing
    const spinSound = document.getElementById('spinSound');
    spinSound.pause();
    spinSound.currentTime = 0;

    theWheel.stopAnimation(false);  // Stop the animation, false as param so does not call callback function.
    
    // Recreate the wheel with current segments
    theWheel = new Winwheel({
        'numSegments': nameList.length,
        'outerRadius': WHEEL_RADIUS,
        'textFontSize': calculateFontSize(nameList.length),
        'textOrientation': 'horizontal',
        'textAlignment': 'center',
        'segments': nameList,
        'animation': {
            'type': 'spinToStop',
            'duration': 15,
            'spins': 8,
            'callbackFinished': alertPrize,
        }
    });

    wheelSpinning = false;  // Reset to false so power buttons and spin can be clicked again.

    // Clear the prize input
    const prizeInput = document.getElementById('prizeInput');
    if (prizeInput) {
        prizeInput.value = '';
    }
}


// -------------------------------------------------------
// Name functionality.
// -------------------------------------------------------

let nameList = theWheel.segments
    .filter(segment => segment != null)
    .sort((a, b) => sortNames(a, b));

// -------------------------------------------------------
// Function for sort the list of names.
// -------------------------------------------------------
function sortNames(a, b) {
    if (a.text < b.text) {
        return -1;
    }
    if (a.text > b.text) {
        return 1;
    }
    return 0;
}

// -------------------------------------------------------
// Function for render the list of names.
// -------------------------------------------------------
function renderNames(todo) {
    localStorage.setItem('nameList', JSON.stringify(nameList));

    const list = document.querySelector('.js-name-list');
    const item = document.querySelector(`[data-key='${todo.id}']`);

    if (todo.deleted) {
        item.remove();
        if (nameList.length === 0) list.innerHTML = '';
        return
    }

    const isChecked = todo.checked ? 'done' : '';
    const node = document.createElement("li");
    node.setAttribute('class', `todo-item ${isChecked}`);
    node.setAttribute('data-key', todo.id);
    node.innerHTML = `
    <span>${todo.text}</span>
    <input class="delete-todo js-delete-todo" type="image" src="https://img.icons8.com/fluency/48/fa314a/delete-sign.png"/>
    `

    if (item) {
        list.replaceChild(node, item);
    } else {
        list.append(node);
    }
}

// -------------------------------------------------------
// Function for re-render the wheel after changes.
// -------------------------------------------------------
function renderWheel() {
    theWheel = new Winwheel({
        'numSegments': nameList.length,
        'outerRadius': WHEEL_RADIUS,
        'textFontSize': calculateFontSize(nameList.length),
        'textOrientation': 'horizontal',
        'textAlignment': 'center',
        'segments': nameList,
        'animation': {
            'type': 'spinToStop',
            'duration': 15,
            'spins': 8,
            'callbackFinished': alertPrize,
        }
    });
    wheelSpinning = false;  // Reset to false so power buttons and spin can be clicked again.
}

// -------------------------------------------------------
// Function to add a name.
// -------------------------------------------------------
function addName(text) {
    const name = {
        text,
        id: Date.now(),
    };

    nameList.push(name);
    renderWheel();
    renderNames(name);
}

// -------------------------------------------------------
// Function to delete a name.
// -------------------------------------------------------
function deleteName(key) {
    const index = nameList.findIndex(item => item.id === Number(key));
    const name = {
        deleted: true,
        ...nameList[index]
    };
    nameList = nameList.filter(item => item.id !== Number(key));
    renderNames(name);
    renderWheel();
}

// -------------------------------------------------------
// Event listener for submiting a name from the input.
// -------------------------------------------------------
const form = document.querySelector('.js-form');
form.addEventListener('submit', event => {
    event.preventDefault();
    const input = document.querySelector('.js-name-input');

    const text = input.value.trim();
    if (text !== '') {
        addName(text);
        input.value = '';
        input.focus();
    }
});

// -------------------------------------------------------
// Event listener for deleting a name from the list.
// -------------------------------------------------------
const list = document.querySelector('.js-name-list');
list.addEventListener('click', event => {
    console.log(event.target.classList);
    if (event.target.classList.contains('js-delete-todo')) {
        const itemKey = event.target.parentElement.dataset.key;
        deleteName(itemKey);
    }
});

// -------------------------------------------------------
// Event listener for the page to load.
// -------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    localStorage.setItem('nameList', JSON.stringify(nameList));
    const ref = localStorage.getItem('nameList');
    if (ref) {
        nameList = JSON.parse(ref);
        nameList.forEach(t => {
            renderNames(t);
        });
    }
});

// -------------------------------------------------------
// Event listener for opening and closing the collapsible list.
// -------------------------------------------------------
var coll = document.getElementsByClassName("collapsible-button");
var i;

for (i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function () {
        this.classList.toggle("active");
        var content = this.nextElementSibling;
        if (content.style.display === "block") {
            content.style.display = "none";
        } else {
            content.style.display = "block";
        }
    });
}

// Add this new function to reset all members
function resetAllMembers() {
    if (confirm('Are you sure you want to reset all members? This will clear all winners and reload the original list.')) {
        // Clear winners
        localStorage.removeItem(WINNERS_KEY);
        
        // Reset members by calling randomizeSegments
        randomizeSegments();
        
        // Reset the wheel
        resetWheel();
        displayWinners(); // Refresh the winners display
    }
}

function displayWinners() {
    const winnersList = document.getElementById('winners-list');
    const winners = JSON.parse(localStorage.getItem(WINNERS_KEY) || '[]');
    
    winnersList.innerHTML = '';
    
    if (winners.length === 0) {
        winnersList.innerHTML = '<li>No winners yet!</li>';
        return;
    }

    winners.reverse().forEach(winner => {
        const li = document.createElement('li');
        const date = new Date(winner.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        li.innerHTML = `
            <div class="winner-info">
                <strong>${winner.name}</strong>
                ${winner.prize ? `<div class="prize">Prize: ${winner.prize}</div>` : ''}
                <div class="timestamp">${formattedDate}</div>
            </div>
        `;
        winnersList.appendChild(li);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Collapsible menu functionality
    const menuButton = document.querySelector('.collapsible-button');
    const menuContent = document.querySelector('.menu-content');
    
    menuButton.addEventListener('click', function() {
        this.classList.toggle('active');
        if (menuContent.style.display === 'block') {
            menuContent.style.display = 'none';
            this.textContent = 'Menu ▼';
        } else {
            menuContent.style.display = 'block';
            this.textContent = 'Menu ▲';
        }
    });

    // Initialize other functionality
    document.querySelector('.reset-all-btn').onclick = resetAllMembers;
    displayWinners();
});

// Update displayWinners function to include timestamps
function displayWinners() {
    const winnersList = document.getElementById('winners-list');
    const winners = JSON.parse(localStorage.getItem(WINNERS_KEY) || '[]');
    
    winnersList.innerHTML = '';
    
    if (winners.length === 0) {
        winnersList.innerHTML = '<li>No winners yet!</li>';
        return;
    }

    winners.reverse().forEach(winner => {
        const li = document.createElement('li');
        const date = new Date(winner.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        li.innerHTML = `
            <div class="winner-info">
                <strong>${winner.name}</strong>
                ${winner.prize ? `<div class="prize">Prize: ${winner.prize}</div>` : ''}
                <div class="timestamp">${formattedDate}</div>
            </div>
        `;
        winnersList.appendChild(li);
    });
}

// Add this function to calculate font size
function calculateFontSize(numSegments) {
    // Base size for few segments (adjust these values to your preference)
    const baseSize = 16;
    const minSize = 6;  // Minimum readable font size
    
    // Exponential reduction as segments increase
    let fontSize = baseSize * Math.exp(-numSegments/100);
    
    // Ensure font size doesn't go below minimum
    return Math.max(fontSize, minSize);
}