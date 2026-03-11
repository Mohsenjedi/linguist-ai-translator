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

let recognition;
let isRecording = false;

// Language Mapping for Speech Recognition
const speechLangMap = {
    'en': 'en-US',
    'fi': 'fi-FI',
    'fa': 'fa-IR'
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

// Initialize Speech Recognition
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
        recordBtn.querySelector('span').textContent = 'Start Translating';
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
        statusDot.classList.add('inactive');
        stopRecording();
    };
} else {
    alert('Speech Recognition API is not supported in this browser. Please use Chrome or Edge.');
}

async function translate(text) {
    if (!text.trim()) return;

    const sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;

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
        } else {
            translatedText.textContent = 'Translation failed. Try again.';
        }
    } catch (error) {
        console.error('Translation error:', error);
        translatedText.textContent = 'Network error. Please check connection.';
    } finally {
        if (isRecording) statusText.textContent = 'Listening...';
    }
}

function startRecording() {
    recognition.lang = speechLangMap[sourceLangSelect.value] || 'en-US';
    recognition.start();
}

function stopRecording() {
    recognition.stop();
}

// Event Listeners
recordBtn.addEventListener('click', () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});

textTranslateBtn.addEventListener('click', () => {
    const text = textToTranslate.value;
    if (text) {
        transcriptText.textContent = text;
        transcriptText.classList.remove('placeholder');
        translate(text);
    }
});

// Quick Action Buttons (EN <-> FI)
document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const text = textToTranslate.value;
        if (!text) return;
        
        const from = btn.getAttribute('data-from');
        const to = btn.getAttribute('data-to');
        
        statusText.textContent = `Translating to ${to === 'fi' ? 'Finnish' : 'English'}...`;
        
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
            }
        } catch (error) {
            console.error('Quick translation error:', error);
        }
    });
});

swapBtn.addEventListener('click', () => {
    const temp = sourceLangSelect.value;
    sourceLangSelect.value = targetLangSelect.value;
    targetLangSelect.value = temp;
    
    // Clear displays
    transcriptText.textContent = 'Your speech will appear here...';
    transcriptText.classList.add('placeholder');
    translatedText.textContent = 'Translation will appear here...';
    translatedText.classList.add('placeholder');
    liveSubtitle.textContent = 'Translation will appear here...';

    if (isRecording) {
        stopRecording();
        setTimeout(startRecording, 300);
    }
});
