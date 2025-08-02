const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fft = require('fft-js').fft;
const fftUtil = require('fft-js').util;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (data) => {
        try {
            // Parse incoming audio data (assuming Float32Array sent as JSON)
            const audioData = JSON.parse(data);

            // Perform FFT to get frequency domain data
            const signal = audioData;
            const spectrum = fft(signal);
            const magnitudes = fftUtil.fftMag(spectrum);

            // Normalize magnitudes to 0-1 range for visualization
            const maxMagnitude = Math.max(...magnitudes);
            const normalized = magnitudes.map(m => maxMagnitude ? m / maxMagnitude : 0);

            // Calculate average amplitude for noise level detection
            const avgAmplitude = magnitudes.reduce((sum, val) => sum + val, 0) / magnitudes.length;

            // Determine noise status
            let status = 'silence';
            if (avgAmplitude > 0.3) {
                status = 'getting-loud';
            } if (avgAmplitude > 0.6) {
                status = 'too-loud';
            }

            // Send frequency data and status back to client
            ws.send(JSON.stringify({
                frequencies: normalized.slice(0, 24), // Match the 24 frequency bars in HTML
                status: status
            }));
        } catch (error) {
            console.error('Error processing audio data:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});