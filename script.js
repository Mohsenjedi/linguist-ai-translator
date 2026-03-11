const recordBtn = document.getElementById('record-btn');
const sourceLangSelect = document.getElementById('source-lang');
const targetLangSelect = document.getElementById('target-lang');
const swapBtn = document.getElementById('swap-langs');
const textToTranslate = document.getElementById('text-to-translate');
const textTranslateBtn = document.getElementById('text-translate-btn');
const transcriptText = document.getElementById('transcript-text');
const translatedText = document.getElementById('translated-text');
const liveSubtitle = document.getElementById('live-subtitle');
const webcamElement = document.getElementById('webcam');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const modeTabs = document.querySelectorAll('.mode-tab');
const activeModeText = document.getElementById('active-mode-text');
const customControls = document.getElementById('custom-controls');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');

let recognition;
let isRecording = false;
let currentMode = 'en-fi'; // Default mode
let history = JSON.parse(localStorage.getItem('translationHistory')) || [];

// Language Mapping for Speech Recognition
const speechLangMap = {
    'en': 'en-US',
    'fi': 'fi-FI',
    'fa': 'fa-IR',
    'de': 'de-DE'
};

const langNames = { 'en': 'English', 'fi': 'Finnish', 'fa': 'Persian', 'de': 'German' };

const modeConfigs = {
    'en-fi': { from: 'en', to: 'fi', label: 'English ➔ Finnish' },
    'fi-en': { from: 'fi', to: 'en', label: 'Finnish ➔ English' },
    'custom': { useSelects: true, label: 'Custom Mode' }
};

// Initialize Webcam
async function setupWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        webcamElement.srcObject = stream;
    } catch (err) {
        console.error("Error accessing webcam: ", err);
        liveSubtitle.textContent = "Webcam access denied. Translation only.";
    }
}

setupWebcam();

// History Management
function saveToHistory(original, translated, from, to) {
    if (!original.trim() || !translated.trim()) return;
    const entry = {
        id: Date.now(),
        original,
        translated,
        from: langNames[from] || from,
        to: langNames[to] || to,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    history.unshift(entry);
    if (history.length > 20) history.pop();
    localStorage.setItem('translationHistory', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-state">No recent translations</div>';
        return;
    }
    historyList.innerHTML = history.map(entry => `
        <div class="history-item">
            <span class="history-lang-pair">${entry.from} ➔ ${entry.to} <small style="float:right; opacity:0.5">${entry.timestamp}</small></span>
            <p class="history-original">${entry.original}</p>
            <p class="history-translated">${entry.translated}</p>
        </div>
    `).join('');
}

renderHistory();

// Speech Recognition Init
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
        isRecording = true;
        recordBtn.classList.add('recording');
        recordBtn.querySelector('span').textContent = 'Stop Listening';
        statusDot.classList.add('pulse');
        statusText.textContent = 'Listening...';
    };

    recognition.onend = () => {
        isRecording = false;
        recordBtn.classList.remove('recording');
        recordBtn.querySelector('span').textContent = 'Start Listening';
        statusDot.classList.remove('pulse');
        statusText.textContent = 'Ready';
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        if (finalTranscript) {
            transcriptText.textContent = finalTranscript;
            transcriptText.classList.remove('placeholder');
            translate(finalTranscript);
        } else if (interimTranscript) {
            transcriptText.textContent = interimTranscript;
            transcriptText.classList.remove('placeholder');
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        statusText.textContent = 'Error: ' + event.error;
        stopRecording();
    };
}

async function translate(text) {
    if (!text.trim()) return;

    let sourceLang, targetLang;
    if (currentMode === 'custom') {
        sourceLang = sourceLangSelect.value;
        targetLang = targetLangSelect.value;
    } else {
        sourceLang = modeConfigs[currentMode].from;
        targetLang = modeConfigs[currentMode].to;
    }

    statusText.textContent = 'Translating...';
    
    try {
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`);
        const data = await response.json();

        if (data.responseData && data.responseData.translatedText) {
            const result = data.responseData.translatedText;
            translatedText.textContent = result;
            translatedText.classList.remove('placeholder');
            liveSubtitle.textContent = result;
            statusText.textContent = 'Translated';
            saveToHistory(text, result, sourceLang, targetLang);
        } else {
            translatedText.textContent = 'Translation failed.';
        }
    } catch (error) {
        console.error('Translation error:', error);
        translatedText.textContent = 'Network error.';
    } finally {
        if (isRecording) statusText.textContent = 'Listening...';
    }
}

function startRecording() {
    let sourceLang;
    if (currentMode === 'custom') {
        sourceLang = sourceLangSelect.value;
    } else {
        sourceLang = modeConfigs[currentMode].from;
    }
    
    recognition.lang = speechLangMap[sourceLang] || 'en-US';
    recognition.start();
}

function stopRecording() {
    recognition.stop();
}

function setMode(modeId) {
    modeTabs.forEach(tab => tab.classList.toggle('active', tab.id === `mode-${modeId}`));
    currentMode = modeId;
    
    if (modeConfigs[modeId].useSelects) {
        customControls.style.display = 'flex';
        activeModeText.style.display = 'none';
    } else {
        customControls.style.display = 'none';
        activeModeText.style.display = 'block';
        activeModeText.textContent = modeConfigs[modeId].label;
    }

    if (isRecording) {
        stopRecording();
        setTimeout(startRecording, 300);
    }
}

// Event Listeners
recordBtn.addEventListener('click', () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});

modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const modeId = tab.id.replace('mode-', '');
        setMode(modeId);
    });
});

clearHistoryBtn.addEventListener('click', () => {
    history = [];
    localStorage.removeItem('translationHistory');
    renderHistory();
});

document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const text = textToTranslate.value;
        if (!text) return;
        const from = btn.getAttribute('data-from');
        const to = btn.getAttribute('data-to');
        statusText.textContent = `Translating...`;
        
        try {
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
            const data = await response.json();
            if (data.responseData && data.responseData.translatedText) {
                const result = data.responseData.translatedText;
                transcriptText.textContent = text;
                transcriptText.classList.remove('placeholder');
                translatedText.textContent = result;
                translatedText.classList.remove('placeholder');
                liveSubtitle.textContent = result;
                statusText.textContent = 'Translated';
                saveToHistory(text, result, from, to);
            }
        } catch (error) {
            console.error(error);
        }
    });
});

textTranslateBtn.addEventListener('click', () => {
    const text = textToTranslate.value;
    if (text) translate(text);
});

swapBtn.addEventListener('click', () => {
    const temp = sourceLangSelect.value;
    sourceLangSelect.value = targetLangSelect.value;
    targetLangSelect.value = temp;
    if (isRecording) {
        stopRecording();
        setTimeout(startRecording, 300);
    }
});
