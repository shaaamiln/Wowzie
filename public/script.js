const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const frequencyBars = document.querySelectorAll('.freq-bar');
const silenceStatus = document.getElementById('silence-status');
const loudStatus = document.getElementById('loud-status');
const tooLoudStatus = document.getElementById('too-loud-status');

// WebSocket connection
const ws = new WebSocket(`ws://${window.location.host}`);

// Audio context setup
let audioContext;
let analyser;
let microphone;
let scriptProcessor;
const bufferSize = 2048; // Matches typical FFT input size

// WebSocket event handlers
ws.onopen = () => {
    console.log('Connected to WebSocket server');
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const { frequencies, status } = data;

    // Update frequency bars
    frequencies.forEach((value, index) => {
        if (frequencyBars[index]) {
            frequencyBars[index].style.height = `${value * 100}%`;
        }
    });

    // Update status messages
    silenceStatus.classList.toggle('active', status === 'silence');
    loudStatus.classList.toggle('active', status === 'getting-loud');
    tooLoudStatus.classList.toggle('active', status === 'too-loud');
};

ws.onclose = () => {
    console.log('Disconnected from WebSocket server');
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

// Audio processing
async function startMonitoring() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphone = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);

        // Connect audio nodes
        microphone.connect(analyser);
        analyser.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);

        // Process audio data
        scriptProcessor.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            const audioData = new Float32Array(inputData);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(audioData));
            }
        };

        // Update UI
        startBtn.disabled = true;
        stopBtn.disabled = false;
    } catch (error) {
        console.error('Error starting audio monitoring:', error);
    }
}

function stopMonitoring() {
    if (scriptProcessor) {
        scriptProcessor.disconnect();
    }
    if (microphone) {
        microphone.disconnect();
    }
    if (analyser) {
        analyser.disconnect();
    }
    if (audioContext) {
        audioContext.close();
    }

    // Reset UI
    frequencyBars.forEach((bar) => {
        bar.style.height = '0%';
    });
    silenceStatus.classList.remove('active');
    loudStatus.classList.remove('active');
    tooLoudStatus.classList.remove('active');

    startBtn.disabled = false;
    stopBtn.disabled = true;
}

// Button event listeners
startBtn.addEventListener('click', startMonitoring);
stopBtn.addEventListener('click', stopMonitoring);

// Initialize UI
stopBtn.disabled = true;