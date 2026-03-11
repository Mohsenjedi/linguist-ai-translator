const recordBtn = document.getElementById('record-btn');
const modeToggle = document.getElementById('mode-toggle');
const transcriptText = document.getElementById('transcript-text');
const translatedText = document.getElementById('translated-text');
const liveSubtitle = document.getElementById('live-subtitle');
const webcamElement = document.getElementById('webcam');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const labelEn = document.getElementById('label-en');
const labelFi = document.getElementById('label-fi');

let recognition;
let isRecording = false;

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
    const isFiToEn = modeToggle.checked;
    const sourceLang = isFiToEn ? 'fi' : 'en';
    const targetLang = isFiToEn ? 'en' : 'fi';

    statusText.textContent = 'Translating...';
    
    try {
        // Using MyMemory API (Free, no key required for basic use)
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
    const isFiToEn = modeToggle.checked;
    recognition.lang = isFiToEn ? 'fi-FI' : 'en-US';
    recognition.start();
}

function stopRecording() {
    recognition.stop();
}

recordBtn.addEventListener('click', () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});

modeToggle.addEventListener('change', () => {
    const isFiToEn = modeToggle.checked;
    if (isFiToEn) {
        labelEn.classList.remove('active');
        labelFi.classList.add('active');
    } else {
        labelEn.classList.add('active');
        labelFi.classList.remove('active');
    }
    
    // Clear display on toggle
    transcriptText.textContent = 'Your speech will appear here...';
    transcriptText.classList.add('placeholder');
    translatedText.textContent = 'Translation will appear here...';
    translatedText.classList.add('placeholder');
    
    if (isRecording) {
        stopRecording();
        setTimeout(startRecording, 300); // Restart with new language
    }
});

// Set initial label state
if (modeToggle.checked) {
    labelFi.classList.add('active');
} else {
    labelEn.classList.add('active');
}
