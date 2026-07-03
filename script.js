// --- iOS Safari Voice Loading Bug Fix ---
let globalVoices = [];
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
        globalVoices = window.speechSynthesis.getVoices();
    };
    globalVoices = window.speechSynthesis.getVoices();
}

let currentCategory = "vegetables";
let currentDeck = [...categoriesData[currentCategory].items];
let currentIndex = 0;
let isImageMode = true;
let isFlipped = false;
let accumulatedScore = 0;
let cardScores = new Array(currentDeck.length).fill(0);

// Speech Recognition setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isRecording = false;
let dummyAudioStream = null;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true; // Changed to true so mic stays active
    recognition.interimResults = false;
}

// DOM Elements
const categorySelect = document.getElementById('categorySelect');
const categoryDescription = document.getElementById('categoryDescription');
const headerTitle = document.querySelector('header h1');
const modeImageBtn = document.getElementById('modeImageBtn');
const modeWordBtn = document.getElementById('modeWordBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const revealBtn = document.getElementById('revealBtn');
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('cardFront');
const cardBack = document.getElementById('cardBack');
const counterText = document.getElementById('counterText');
const progressBar = document.getElementById('progressBar');
const totalScoreBadge = document.getElementById('totalScoreBadge');

// Speech DOM Elements
const micBtn = document.getElementById('micBtn');
const speechStatus = document.getElementById('speechStatus');
const scoreBreakdown = document.getElementById('scoreBreakdown');
const scoreCorrect = document.getElementById('scoreCorrect');
const scoreAccent = document.getElementById('scoreAccent');
const scoreFluency = document.getElementById('scoreFluency');
const wordScoreTotal = document.getElementById('wordScoreTotal');
const heardWord = document.getElementById('heardWord');

// Initialize
function init() {
    // Populate Category Dropdown
    categorySelect.innerHTML = '';
    for (const key in categoriesData) {
        const option = document.createElement('option');
        option.value = key;
        option.innerText = `${categoriesData[key].emoji} ${categoriesData[key].name}`;
        categorySelect.appendChild(option);
    }
    
    // Set initial category visually
    categorySelect.value = currentCategory;
    
    if (!SpeechRecognition) {
        speechStatus.innerHTML = "⚠️ เบราว์เซอร์ของคุณไม่รองรับระบบฟังเสียง<br>โปรดใช้ Google Chrome หรือ Edge";
        micBtn.style.display = 'none';
    }
    
    loadCategory(currentCategory);
}

function loadCategory(categoryId) {
    currentCategory = categoryId;
    const catData = categoriesData[categoryId];
    
    // Update Header
    headerTitle.innerText = `${catData.emoji} Vocab Tester`;
    categoryDescription.innerText = catData.desc;
    
    // Reset Deck and State
    currentDeck = [...catData.items];
    currentIndex = 0;
    isFlipped = false;
    accumulatedScore = 0;
    cardScores = new Array(currentDeck.length).fill(0);
    
    flashcard.classList.remove('flipped');
    renderCard();
    updateUI();
    
    // Check if we are in Worksheet mode and re-render
    if (typeof isWorksheetMode !== 'undefined' && isWorksheetMode) {
        renderWorksheet();
    }
    
    // Check if we are in Teaching mode and re-render
    if (typeof isTeachingMode !== 'undefined' && isTeachingMode) {
        renderTeachingMode();
    }
    
    // Check if we are in Game mode and re-render
    if (typeof isGameMode !== 'undefined' && isGameMode) {
        startNewGame();
    }
    
    // Check if we are in Sentence mode and re-render
    if (typeof isSentenceMode !== 'undefined' && isSentenceMode) {
        renderSentenceCard();
    }
    
    // Check if we are in Hangman mode and re-render
    if (typeof isHangmanMode !== 'undefined' && isHangmanMode) {
        renderHangmanCard();
    }
}

// Shuffle function
function shuffleArray(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function renderCard() {
    if (currentDeck.length === 0) return;
    
    const item = currentDeck[currentIndex];
    // Notice the updated image path: images/categoryID/item.id.png
    const imgPath = `images/${currentCategory}/${item.id}.png`;
    const imageHtml = `<img src="${imgPath}" alt="${item.en}" class="card-image" onerror="this.outerHTML='<div class=\\'empty-state\\'>⚠️ ไม่พบรูปภาพ<br><b>${imgPath}</b><br>โปรดนำไฟล์ไปวางให้ถูกตำแหน่ง</div>'">`;
    
    const wordHtml = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
            <div class="card-word-en">${item.en}</div>
            <button class="tc-speaker" onclick="event.stopPropagation(); speakWord('${item.en.replace(/'/g, "\\'")}')" style="font-size: 2rem; cursor: pointer; background: none; border: none; padding: 10px; border-radius: 50%; display: flex; align-items: center; justify-content: center;" title="ฟังเสียง">🔊</button>
        </div>
        <div class="card-word-th">${item.th}</div>
        <div class="card-pronunciation">/ ${item.pron} /</div>
    `;

    const speakerBtnHtml = `<button class="tc-speaker" onclick="event.stopPropagation(); speakWord('${item.en.replace(/'/g, "\\'")}')" style="position: absolute; top: 15px; right: 15px; font-size: 2rem; cursor: pointer; background: white; border: 2px solid #E5E7EB; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 10px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 10;" title="ฟังเสียง">🔊</button>`;

    if (isImageMode) {
        cardFront.innerHTML = speakerBtnHtml + imageHtml;
        cardBack.innerHTML = `
            <div class="card-content-left">${imageHtml}</div>
            <div class="card-content-right">${wordHtml}</div>
        `;
    } else {
        cardFront.innerHTML = `
            ${speakerBtnHtml}
            <div class="card-word-en">${item.en}</div>
        `;
        cardBack.innerHTML = `
            <div class="card-content-left">${imageHtml}</div>
            <div class="card-content-right">${wordHtml}</div>
        `;
    }

    if (isFlipped) {
        flashcard.classList.remove('flipped');
        isFlipped = false;
    }
    
    // Reset Speech UI for new card
    scoreBreakdown.style.display = 'none';
    speechStatus.innerText = "กดปุ่มไมค์แล้วพูดคำศัพท์ภาษาอังกฤษ";
}

function updateUI() {
    counterText.innerText = `${currentIndex + 1} / ${currentDeck.length}`;
    progressBar.style.width = `${((currentIndex + 1) / currentDeck.length) * 100}%`;
    totalScoreBadge.innerText = `⭐ รวม: ${accumulatedScore} คะแนน`;
    
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === currentDeck.length - 1;
}

function resetSpeechUI() {
    scoreBreakdown.style.display = 'none';
    heardWord.innerText = '';
    scoreCorrect.innerText = '0/2';
    scoreAccent.innerText = '0/2';
    scoreFluency.innerText = '0/1';
    wordScoreTotal.innerText = '0';
    if (isRecording) {
        speechStatus.innerText = "กำลังฟังเสียง... (พูดเลย)";
    } else {
        speechStatus.innerText = "กดปุ่มไมค์แล้วพูดคำศัพท์ภาษาอังกฤษ";
    }
}

function nextCard() {
    if (currentIndex < currentDeck.length - 1) {
        currentIndex++;
        isFlipped = false;
        flashcard.classList.remove('flipped');
        resetSpeechUI();
        setTimeout(() => {
            renderCard();
            updateUI();
        }, 150);
    }
}

function prevCard() {
    if (currentIndex > 0) {
        currentIndex--;
        isFlipped = false;
        flashcard.classList.remove('flipped');
        resetSpeechUI();
        setTimeout(() => {
            renderCard();
            updateUI();
        }, 150);
    }
}


function flipCard() {
    isFlipped = !isFlipped;
    if (isFlipped) {
        flashcard.classList.add('flipped');
    } else {
        flashcard.classList.remove('flipped');
    }
}

// Levenshtein distance for string matching fuzziness
function getEditDistance(a, b) {
    if(a.length == 0) return b.length; 
    if(b.length == 0) return a.length; 
    var matrix = [];
    for(var i = 0; i <= b.length; i++){
        matrix[i] = [i];
    }
    for(var j = 0; j <= a.length; j++){
        matrix[0][j] = j;
    }
    for(var i = 1; i <= b.length; i++){
        for(var j = 1; j <= a.length; j++){
            if(b.charAt(i-1) == a.charAt(j-1)){
                matrix[i][j] = matrix[i-1][j-1];
            } else {
                matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, Math.min(matrix[i][j-1] + 1, matrix[i-1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
}

// Speech Recognition Handlers
if (recognition) {
    recognition.onstart = function() {
        isRecording = true;
        micBtn.classList.add('recording');
        speechStatus.innerText = "กำลังฟังเสียง... (พูดเลย)";
        scoreBreakdown.style.display = 'none';
    };

    recognition.onresult = function(event) {
        let targetWord = currentDeck[currentIndex].en.toLowerCase().trim();
        
        // Handle Sentence Mode override
        if (typeof isSentenceMode !== 'undefined' && isSentenceMode) {
            const templateSelect = document.getElementById('sentenceTemplateSelect');
            if (templateSelect) {
                targetWord = templateSelect.value.replace('{word}', targetWord).toLowerCase().trim();
                // Remove punctuation for easier matching
                targetWord = targetWord.replace(/[.,?]/g, '');
            }
        }
        
        const lastResultIndex = event.results.length - 1;
        const transcriptRaw = event.results[lastResultIndex][0].transcript.toLowerCase().trim();
        const transcript = transcriptRaw.replace(/[.,?]/g, '');
        const confidence = event.results[lastResultIndex][0].confidence;
        
        heardWord.innerText = transcriptRaw;
        
        // 1. Correctness (2 points)
        let correctnessScore = 0;
        if (transcript.includes(targetWord)) {
            correctnessScore = 2;
        } else {
            const distance = getEditDistance(targetWord, transcript);
            if (distance <= 2 && targetWord.length > 4) {
                correctnessScore = 1;
            } else if (distance <= 1) {
                correctnessScore = 1;
            }
        }

        // 2. Accent/Clarity (2 points)
        let accentScore = 0;
        if (correctnessScore > 0) {
            if (confidence > 0.85) {
                accentScore = 2;
            } else if (confidence > 0.6) {
                accentScore = 1;
            }
        }

        // 3. Fluency (1 point)
        let fluencyScore = 0;
        if (correctnessScore > 0) {
            const transcriptWords = transcript.split(' ').length;
            const targetWords = targetWord.split(' ').length;
            if (transcriptWords === targetWords) {
                fluencyScore = 1;
            }
        }

        const wordTotal = correctnessScore + accentScore + fluencyScore;
        
        // Update accumulated score
        accumulatedScore = accumulatedScore - cardScores[currentIndex] + wordTotal;
        cardScores[currentIndex] = wordTotal;
        
        // Update Breakdown UI
        scoreCorrect.innerText = `${correctnessScore}/2`;
        scoreAccent.innerText = `${accentScore}/2`;
        scoreFluency.innerText = `${fluencyScore}/1`;
        wordScoreTotal.innerText = wordTotal;
        
        speechStatus.innerText = wordTotal >= 4 ? "ยอดเยี่ยมมาก! 🌟" : wordTotal > 0 ? "พยายามได้ดีครับ 👍" : "ลองพูดใหม่อีกครั้งนะ ✌️";
        scoreBreakdown.style.display = 'flex';
        
        updateUI();
    };

    recognition.onerror = function(event) {
        console.error("Speech error:", event.error);
        if (event.error === 'no-speech') {
            speechStatus.innerText = "ไม่ได้ยินเสียงเลย ลองกดพูดใหม่นะครับ";
        } else {
            speechStatus.innerText = "เกิดข้อผิดพลาดในการฟังเสียง: " + event.error;
        }
    };

    recognition.onend = function() {
        isRecording = false;
        micBtn.classList.remove('recording');
        if (speechStatus.innerText === "กำลังฟังเสียง... (พูดเลย)") {
            speechStatus.innerText = "ประมวลผลเสร็จสิ้น";
        }
    };

    micBtn.addEventListener('click', () => {
        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });
}

// Event Listeners
categorySelect.addEventListener('change', (e) => {
    loadCategory(e.target.value);
});

// Fullscreen Logic
const fullscreenBtn = document.getElementById('fullscreenBtn');
if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
            fullscreenBtn.innerText = '🗗 ย่อจอ';
        } else {
            document.exitFullscreen();
            fullscreenBtn.innerText = '⛶ เต็มจอ';
        }
    });
    
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            fullscreenBtn.innerText = '⛶ เต็มจอ';
        }
    });
}

modeImageBtn.addEventListener('click', () => {
    restoreMainUI();
    isImageMode = true;
    modeImageBtn.classList.add('active');
    modeWordBtn.classList.remove('active');
    isFlipped = false;
    flashcard.classList.remove('flipped');
    setTimeout(renderCard, 200);
});

modeWordBtn.addEventListener('click', () => {
    restoreMainUI();
    isImageMode = false;
    modeWordBtn.classList.add('active');
    modeImageBtn.classList.remove('active');
    isFlipped = false;
    flashcard.classList.remove('flipped');
    setTimeout(renderCard, 200);
});

shuffleBtn.addEventListener('click', () => {
    currentDeck = shuffleArray([...currentDeck]);
    currentIndex = 0;
    isFlipped = false;
    flashcard.classList.remove('flipped');
    accumulatedScore = 0;
    cardScores.fill(0);
    
    const svg = shuffleBtn.querySelector('svg');
    svg.style.transition = 'transform 0.5s ease';
    svg.style.transform = 'rotate(360deg)';
    setTimeout(() => { svg.style.transition = 'none'; svg.style.transform = 'rotate(0deg)'; }, 500);

    setTimeout(() => {
        renderCard();
        updateUI();
    }, 200);
});

prevBtn.addEventListener('click', prevCard);
nextBtn.addEventListener('click', nextCard);
revealBtn.addEventListener('click', flipCard);
flashcard.addEventListener('click', flipCard);

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        flipCard();
    } else if (e.code === 'ArrowRight') {
        nextCard();
    } else if (e.code === 'ArrowLeft') {
        prevCard();
    }
});

// --- Worksheet Mode Logic ---
const modeWorksheetBtn = document.getElementById('modeWorksheetBtn');
const flashcardApp = document.getElementById('flashcardApp');
const worksheetApp = document.getElementById('worksheetApp');
const mainHeader = document.getElementById('mainHeader');
const worksheetGrid = document.getElementById('worksheetGrid');
const wsShuffleBtn = document.getElementById('wsShuffleBtn');
const wsAnswerBtn = document.getElementById('wsAnswerBtn');

let isWorksheetMode = false;
let wsAnswersRevealed = false;

function clearAllModes() {
    isImageMode = false;
    isWorksheetMode = false;
    isTeachingMode = false;
    isGameMode = false;
    isSentenceMode = false;
    if (typeof isHangmanMode !== 'undefined') isHangmanMode = false;

    const allBtns = [modeImageBtn, modeWordBtn, modeWorksheetBtn];
    if (typeof modeTeachingBtn !== 'undefined') allBtns.push(modeTeachingBtn);
    if (typeof modeGameBtn !== 'undefined') allBtns.push(modeGameBtn);
    if (typeof modeSentenceBtn !== 'undefined') allBtns.push(modeSentenceBtn);
    if (typeof modeHangmanBtn !== 'undefined') allBtns.push(modeHangmanBtn);
    allBtns.forEach(btn => btn && btn.classList.remove('active'));

    const allApps = [flashcardApp, worksheetApp];
    if (typeof teachingApp !== 'undefined') allApps.push(teachingApp);
    if (typeof gameApp !== 'undefined') allApps.push(gameApp);
    if (typeof sentenceApp !== 'undefined') allApps.push(sentenceApp);
    if (typeof hangmanApp !== 'undefined') allApps.push(hangmanApp);
    allApps.forEach(app => app && (app.style.display = 'none'));
    
    mainHeader.querySelector('h1').style.display = 'none';
    mainHeader.querySelector('p').style.display = 'none';
}

modeWorksheetBtn.addEventListener('click', () => {
    clearAllModes();
    isWorksheetMode = true;
    modeWorksheetBtn.classList.add('active');
    worksheetApp.style.display = 'block';
    renderWorksheet();
});

function restoreMainUI() {
    clearAllModes();
    flashcardApp.style.display = 'block';
    mainHeader.querySelector('h1').style.display = 'block';
    mainHeader.querySelector('p').style.display = 'block';
    
    // Reset Speech UI
    scoreBreakdown.style.display = 'none';
    speechStatus.innerText = "กดปุ่มไมค์แล้วพูดคำศัพท์ภาษาอังกฤษ";
}

modeImageBtn.addEventListener('click', (e) => {
    // Note: Actual logic is handled in the earlier modeImageBtn listener,
    // we just leave this empty or let it be handled.
});

modeWordBtn.addEventListener('click', (e) => {
    // Note: Actual logic is handled in the earlier modeWordBtn listener
});

function renderWorksheet() {
    worksheetGrid.innerHTML = '';
    wsAnswersRevealed = false;
    wsAnswerBtn.innerText = '✅ ดูเฉลย';
    wsAnswerBtn.classList.remove('btn-danger');
    wsAnswerBtn.classList.add('btn-primary');

    const catData = categoriesData[currentCategory];
    const allItems = [...catData.items];
    
    // Sort words alphabetically
    const sortedWords = [...allItems].sort((a, b) => a.en.localeCompare(b.en));
    
    // Shuffle images
    const shuffledItems = shuffleArray([...allItems]);
    
    // 1. Build Words Box (Top section)
    const wordsBox = document.createElement('div');
    wordsBox.className = 'ws-words-box';
    sortedWords.forEach(item => {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'ws-word-item';
        wordDiv.innerText = item.en;
        wordsBox.appendChild(wordDiv);
    });

    // 2. Build Images Grid (Bottom section)
    const imagesGrid = document.createElement('div');
    imagesGrid.className = 'ws-images-grid';
    shuffledItems.forEach((item, index) => {
        imagesGrid.appendChild(createWsImageItem(item, index + 1));
    });

    // Append both to the main container
    worksheetGrid.appendChild(wordsBox);
    worksheetGrid.appendChild(imagesGrid);
}

function createWsImageItem(item, displayNum) {
    const div = document.createElement('div');
    div.className = 'ws-image-item';
    
    const imgPath = `images/${currentCategory}/${item.id}.png`;
    div.innerHTML = `
        <div class="ws-image-number">${displayNum}</div>
        <img src="${imgPath}" alt="Image ${displayNum}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'150\\' height=\\'150\\'><rect width=\\'150\\' height=\\'150\\' fill=\\'%23eee\\'/><text x=\\'50%\\' y=\\'50%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' font-size=\\'20\\'>No Image</text></svg>'">
        <div class="ws-answer-overlay">${item.en} (${item.th})</div>
    `;
    return div;
}

wsShuffleBtn.addEventListener('click', renderWorksheet);

wsAnswerBtn.addEventListener('click', () => {
    wsAnswersRevealed = !wsAnswersRevealed;
    const overlays = document.querySelectorAll('.ws-answer-overlay');
    
    overlays.forEach(overlay => {
        if (wsAnswersRevealed) {
            overlay.classList.add('show');
        } else {
            overlay.classList.remove('show');
        }
    });

    if (wsAnswersRevealed) {
        wsAnswerBtn.innerText = '❌ ซ่อนเฉลย';
        wsAnswerBtn.classList.remove('btn-primary');
        wsAnswerBtn.classList.add('btn-danger');
    } else {
        wsAnswerBtn.innerText = '✅ ดูเฉลย';
        wsAnswerBtn.classList.remove('btn-danger');
        wsAnswerBtn.classList.add('btn-primary');
    }
});

// --- Teaching Mode Logic ---
const modeTeachingBtn = document.getElementById('modeTeachingBtn');
const teachingApp = document.getElementById('teachingApp');
const teachingGrid = document.getElementById('teachingGrid');
let isTeachingMode = false;

modeTeachingBtn.addEventListener('click', () => {
    clearAllModes();
    isTeachingMode = true;
    modeTeachingBtn.classList.add('active');
    teachingApp.style.display = 'block';
    renderTeachingMode();
});

function renderTeachingMode() {
    teachingGrid.innerHTML = '';
    const catData = categoriesData[currentCategory];
    const allItems = [...catData.items];
    
    allItems.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'teaching-card';
        
        const imgPath = `images/${currentCategory}/${item.id}.png`;
        
        card.innerHTML = `
            <div class="tc-number">${index + 1}</div>
            <div class="tc-speaker" onclick="speakWord('${item.en.replace(/'/g, "\\'")}')" title="ฟังเสียงอ่าน">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
            </div>
            <img src="${imgPath}" class="tc-image" alt="${item.en}" style="cursor: pointer;" onclick="speakWord('${item.en.replace(/'/g, "\\'")}')" title="คลิกรูปเพื่อฟังเสียง" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'150\\' height=\\'150\\'><rect width=\\'150\\' height=\\'150\\' fill=\\'%23eee\\'/><text x=\\'50%\\' y=\\'50%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' font-size=\\'20\\'>No Image</text></svg>'">
            <div class="tc-en">${item.en}</div>
            <div class="tc-th">${item.th}</div>
            <div class="tc-pron">/ ${item.pron} /</div>
        `;
        teachingGrid.appendChild(card);
    });
}

let isTextHidden = false;
function toggleTeachingText() {
    isTextHidden = !isTextHidden;
    const btn = document.getElementById('toggleTextBtn');
    if (isTextHidden) {
        teachingGrid.classList.add('hide-text-mode');
        btn.innerHTML = '👁️ เปิดคำศัพท์';
        btn.style.background = '#10B981';
    } else {
        teachingGrid.classList.remove('hide-text-mode');
        btn.innerHTML = '👁️ ปิดคำศัพท์';
        btn.style.background = '#F59E0B';
    }
}

function speakWord(text) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9; // slightly slower for students
        
        let voices = window.speechSynthesis.getVoices();
        if (voices.length === 0 && typeof globalVoices !== 'undefined') voices = globalVoices;
        
        let enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Siri') || v.name.includes('Samantha')));
        if (!enVoice) enVoice = voices.find(v => v.lang.startsWith('en'));
        
        if (enVoice) {
            utterance.voice = enVoice;
        } else {
            utterance.lang = 'en-US';
        }
        
        window.speechSynthesis.speak(utterance);
    } else {
        alert("ขออภัย เบราว์เซอร์ของคุณไม่รองรับระบบอ่านออกเสียง");
    }
}

// --- Game Mode Logic (Memory Match) ---
const modeGameBtn = document.getElementById('modeGameBtn');
const gameApp = document.getElementById('gameApp');
const gameGrid = document.getElementById('gameGrid');
const gameMovesText = document.getElementById('gameMoves');
const gameRestartBtn = document.getElementById('gameRestartBtn');

let isGameMode = false;
let gameCards = [];
let flippedCards = [];
let matchedPairs = 0;
let gameMoves = 0;
let lockBoard = false;

modeGameBtn.addEventListener('click', () => {
    clearAllModes();
    isGameMode = true;
    modeGameBtn.classList.add('active');
    gameApp.style.display = 'block';
    startNewGame();
});

function startNewGame() {
    gameGrid.innerHTML = '';
    flippedCards = [];
    matchedPairs = 0;
    gameMoves = 0;
    lockBoard = false;
    gameMovesText.innerText = '0';
    
    const catData = categoriesData[currentCategory];
    const allItems = [...catData.items];
    
    // Pick 6 random items from the category
    shuffleArray(allItems);
    const selectedItems = allItems.slice(0, 6);
    
    // Create 12 cards: 6 images, 6 words
    gameCards = [];
    selectedItems.forEach(item => {
        gameCards.push({ type: 'image', data: item });
        gameCards.push({ type: 'word', data: item });
    });
    
    // Shuffle the 12 cards
    shuffleArray(gameCards);
    
    // Render the grid
    gameCards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'game-card';
        cardElement.dataset.id = card.data.id; // to match pairs
        
        let backContent = '';
        if (card.type === 'image') {
            const imgPath = `images/${currentCategory}/${card.data.id}.png`;
            backContent = `<img src="${imgPath}" class="game-card-img" alt="${card.data.en}">`;
        } else {
            backContent = `<div class="game-card-text">${card.data.en}</div>`;
        }
        
        cardElement.innerHTML = `
            <div class="game-card-inner">
                <div class="game-card-front">${index + 1}</div>
                <div class="game-card-back">${backContent}</div>
            </div>
        `;
        
        cardElement.addEventListener('click', () => flipGameCard(cardElement));
        gameGrid.appendChild(cardElement);
    });
}

function flipGameCard(cardElement) {
    if (lockBoard) return;
    if (cardElement.classList.contains('flipped') || cardElement.classList.contains('matched')) return;
    
    cardElement.classList.add('flipped');
    flippedCards.push(cardElement);
    
    if (flippedCards.length === 2) {
        lockBoard = true;
        gameMoves++;
        gameMovesText.innerText = gameMoves;
        checkForMatch();
    }
}

function checkForMatch() {
    const isMatch = flippedCards[0].dataset.id === flippedCards[1].dataset.id;
    
    if (isMatch) {
        disableCards();
    } else {
        unflipCards();
    }
}

function disableCards() {
    // Wait a brief moment before marking as matched to let them see it
    setTimeout(() => {
        flippedCards[0].classList.add('matched');
        flippedCards[1].classList.add('matched');
        
        matchedPairs++;
        if (matchedPairs === 6) {
            setTimeout(() => {
                alert(`ยอดเยี่ยม! 🎊\\nคุณเคลียร์กระดานได้ใน ${gameMoves} ครั้ง!`);
            }, 500);
        }
        
        flippedCards = [];
        lockBoard = false;
    }, 500);
}

function unflipCards() {
    setTimeout(() => {
        flippedCards[0].classList.remove('flipped');
        flippedCards[1].classList.remove('flipped');
        flippedCards = [];
        lockBoard = false;
    }, 1200);
}

gameRestartBtn.addEventListener('click', startNewGame);

// Update restoreMainUI to handle game mode
const originalRestoreMainUI2 = restoreMainUI;
restoreMainUI = function() {
    isGameMode = false;
    gameApp.style.display = 'none';
    originalRestoreMainUI2();
};

// --- Sentence Mode Logic ---
const modeSentenceBtn = document.getElementById('modeSentenceBtn');
const sentenceApp = document.getElementById('sentenceApp');
const sentenceTemplateSelect = document.getElementById('sentenceTemplateSelect');
const sentenceCardFront = document.getElementById('sentenceCardFront');
const sPrevBtn = document.getElementById('sPrevBtn');
const sNextBtn = document.getElementById('sNextBtn');
const sRevealBtn = document.getElementById('sRevealBtn');
const sentenceSpeechPlaceholder = document.getElementById('sentenceSpeechPlaceholder');

let isSentenceMode = false;
let sentenceRevealed = false;

if (modeSentenceBtn) {
    modeSentenceBtn.addEventListener('click', () => {
        clearAllModes();
        isSentenceMode = true;
        modeSentenceBtn.classList.add('active');
        sentenceApp.style.display = 'block';
        
        // Move speech container to sentence mode
        const speechContainer = document.getElementById('speechContainer');
        if (speechContainer) {
            sentenceSpeechPlaceholder.appendChild(speechContainer);
        }
        
        renderSentenceCard();
    });
}

function renderSentenceCard() {
    const item = currentDeck[currentIndex];
    const template = sentenceTemplateSelect.value;
    
    const imgPath = `images/${currentCategory}/${item.id}.png`;
    
    let sentenceHTML = '';
    const parts = template.split('{word}');
    
    if (sentenceRevealed) {
        sentenceHTML = `
            ${parts[0]}<span class="sentence-blank revealed">${item.en}</span>${parts[1] || ''}
            <div style="font-size: 1.2rem; color: var(--text-main); margin-top: 10px;">( ${item.th} )</div>
        `;
    } else {
        sentenceHTML = `
            ${parts[0]}<span class="sentence-blank">______</span>${parts[1] || ''}
            <div style="font-size: 1.2rem; color: var(--text-muted); margin-top: 10px;">( คำแปล: ${item.th} )</div>
        `;
    }
    
    sentenceCardFront.innerHTML = `
        <img src="${imgPath}" class="sentence-image" alt="${item.en}">
        <div class="sentence-text">${sentenceHTML}</div>
    `;
    
    // Update navigation states
    sPrevBtn.disabled = currentIndex === 0;
    sNextBtn.disabled = currentIndex === currentDeck.length - 1;
    
    // Reset Speech UI
    const scoreBreakdown = document.getElementById('scoreBreakdown');
    const speechStatus = document.getElementById('speechStatus');
    if (scoreBreakdown) scoreBreakdown.style.display = 'none';
    if (speechStatus) speechStatus.innerText = "กดปุ่มไมค์แล้วพูดทั้งประโยคภาษาอังกฤษ";
}

if (sentenceTemplateSelect) {
    sentenceTemplateSelect.addEventListener('change', () => {
        sentenceRevealed = false;
        renderSentenceCard();
    });
}

if (sPrevBtn) {
    sPrevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            sentenceRevealed = false;
            renderSentenceCard();
        }
    });
}

if (sNextBtn) {
    sNextBtn.addEventListener('click', () => {
        if (currentIndex < currentDeck.length - 1) {
            currentIndex++;
            sentenceRevealed = false;
            renderSentenceCard();
        }
    });
}

if (sRevealBtn) {
    sRevealBtn.addEventListener('click', () => {
        sentenceRevealed = !sentenceRevealed;
        renderSentenceCard();
    });
}

// Update restoreMainUI to handle sentence mode
const originalRestoreMainUI3 = restoreMainUI;
restoreMainUI = function() {
    isSentenceMode = false;
    sentenceApp.style.display = 'none';
    
    // Put speech container back to flashcard mode
    const speechContainer = document.getElementById('speechContainer');
    const flashcardApp = document.getElementById('flashcardApp');
    const navDiv = flashcardApp.querySelector('.navigation');
    if (speechContainer && navDiv) {
        flashcardApp.insertBefore(speechContainer, navDiv);
    }
    
    originalRestoreMainUI3();
};

// Text-to-Speech Helper
function speakWord(text) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9; // Slightly slower for clearer pronunciation
        
        let voices = window.speechSynthesis.getVoices();
        if (voices.length === 0 && typeof globalVoices !== 'undefined') voices = globalVoices;
        
        let enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Siri') || v.name.includes('Samantha')));
        if (!enVoice) enVoice = voices.find(v => v.lang.startsWith('en'));
        
        if (enVoice) {
            utterance.voice = enVoice;
        } else {
            utterance.lang = 'en-US';
        }
        
        window.speechSynthesis.speak(utterance);
    } else {
        alert('เบราว์เซอร์ของคุณไม่รองรับระบบอ่านออกเสียงครับ');
    }
}

// Load voices proactively
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = function() {
        window.speechSynthesis.getVoices();
    };
}

// --- Hangman Mode Logic ---
const modeHangmanBtn = document.getElementById('modeHangmanBtn');
const hangmanApp = document.getElementById('hangmanApp');
const hmImage = document.getElementById('hmImage');
const hmWordContainer = document.getElementById('hmWordContainer');
const hmKeyboard = document.getElementById('hmKeyboard');
const hmResult = document.getElementById('hmResult');
const hangmanHearts = document.getElementById('hangmanHearts');
const hmPrevBtn = document.getElementById('hmPrevBtn');
const hmNextBtn = document.getElementById('hmNextBtn');
const hmShuffleBtn = document.getElementById('hmShuffleBtn');

let isHangmanMode = false;
let hmHeartsCount = 5;
let hmWord = '';
let hmGuessed = new Set();
let hmGameOver = false;

if (modeHangmanBtn) {
    modeHangmanBtn.addEventListener('click', () => {
        clearAllModes();
        isHangmanMode = true;
        modeHangmanBtn.classList.add('active');
        hangmanApp.style.display = 'block';
        renderHangmanCard();
    });

    hmPrevBtn.addEventListener('click', () => {
        prevCard(); // Updates currentIndex
        if (isHangmanMode) renderHangmanCard();
    });
    
    hmNextBtn.addEventListener('click', () => {
        nextCard(); // Updates currentIndex
        if (isHangmanMode) renderHangmanCard();
    });

    if (hmShuffleBtn) {
        hmShuffleBtn.addEventListener('click', () => {
            // Shuffle the array using Fisher-Yates
            for (let i = currentDeck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [currentDeck[i], currentDeck[j]] = [currentDeck[j], currentDeck[i]];
            }
            currentIndex = 0;
            updateUI(); // to update the counter text (e.g. 1 / 20)
            if (isHangmanMode) renderHangmanCard();
        });
    }

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (!isHangmanMode || hmGameOver) return;
        
        // Handle A-Z
        if (e.keyCode >= 65 && e.keyCode <= 90) {
            const letter = String.fromCharCode(e.keyCode).toLowerCase();
            guessHangmanLetter(letter);
        }
    });
}

function renderHangmanCard() {
    if (currentDeck.length === 0) return;
    
    hmGameOver = false;
    hmHeartsCount = 5;
    hmGuessed.clear();
    hmResult.innerText = '';
    updateHangmanHearts();
    
    const item = currentDeck[currentIndex];
    hmWord = item.en.toLowerCase();
    
    hmImage.src = `images/${currentCategory}/${item.id}.png`;
    hmImage.onerror = function() {
        this.src = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><rect width='300' height='300' fill='%23eee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='20'>No Image</text></svg>`;
    };
    
    renderHangmanWord();
    renderHangmanKeyboard();
}

function updateHangmanHearts() {
    hangmanHearts.innerText = '❤️'.repeat(hmHeartsCount) + '🖤'.repeat(5 - hmHeartsCount);
}

function renderHangmanWord() {
    hmWordContainer.innerHTML = '';
    let allRevealed = true;
    
    for (let char of hmWord) {
        if (char === ' ' || char === '-' || char === "'") {
            const box = document.createElement('div');
            box.className = 'hm-letter-box revealed';
            box.style.borderBottom = 'none';
            box.style.width = '30px';
            box.innerText = char;
            hmWordContainer.appendChild(box);
        } else if (/[a-z]/.test(char)) {
            const box = document.createElement('div');
            box.className = 'hm-letter-box';
            if (hmGuessed.has(char)) {
                box.classList.add('revealed');
                box.innerText = char;
            } else {
                allRevealed = false;
                box.innerText = '_';
            }
            hmWordContainer.appendChild(box);
        }
    }
    
    if (allRevealed && hmWord.length > 0 && !hmGameOver) {
        hmGameOver = true;
        hmResult.innerText = '🎉 ถูกต้องเก่งมาก!';
        hmResult.style.color = '#10B981';
        speakWord(currentDeck[currentIndex].en);
    }
}

function renderHangmanKeyboard() {
    hmKeyboard.innerHTML = '';
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    
    letters.forEach(letter => {
        const btn = document.createElement('button');
        btn.className = 'hm-key';
        btn.innerText = letter;
        
        if (hmGuessed.has(letter)) {
            btn.disabled = true;
            if (hmWord.includes(letter)) {
                btn.classList.add('correct');
            } else {
                btn.classList.add('wrong');
            }
        }
        
        btn.addEventListener('click', () => {
            guessHangmanLetter(letter);
        });
        
        hmKeyboard.appendChild(btn);
    });
}

function guessHangmanLetter(letter) {
    if (hmGameOver || hmGuessed.has(letter)) return;
    
    hmGuessed.add(letter);
    
    if (!hmWord.includes(letter)) {
        hmHeartsCount--;
        updateHangmanHearts();
        
        if (hmHeartsCount <= 0) {
            hmGameOver = true;
            hmResult.innerText = '💔 เสียใจด้วย คำตอบคือ: ' + currentDeck[currentIndex].en;
            hmResult.style.color = '#EF4444';
            
            // Auto reveal all letters
            for (let char of hmWord) {
                if (/[a-z]/.test(char)) hmGuessed.add(char);
            }
            renderHangmanWord();
            renderHangmanKeyboard();
            speakWord(currentDeck[currentIndex].en);
            return;
        }
    }
    
    renderHangmanWord();
    renderHangmanKeyboard();
}

// Start
init();
