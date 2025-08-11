// Ensure we can use Node.js APIs
const fs = require('fs');
const dgram = require('dgram');
const Fuse = require('fuse.js');

const imagePath = '/tmp/output.jpg';
const imageElement = document.getElementById('image');
//const udpMessageElement = document.getElementById('udp-messages');
let udpMessageElement = document.getElementById('udp-messages');
let lastImageUpdateTime = Date.now(); // Initialize to current time to display the first image

const timeout = 5000; // ms

const imageUpdateInterval = 30; // ms - 30 fps
const oversampling_rate = 1; // sample at N times the update frequency
const fetchInterval = imageUpdateInterval / oversampling_rate;

// Read UDP port from HTML data attribute, fallback to 5002
const udpPort = parseInt(document.body.getAttribute('data-udp-port')) || 5002;
const udpServer = dgram.createSocket('udp4');

// Variables to store the latest detected face count and attending face count
let total_faces = 'N/A';
let attending_faces = 'N/A';
let display_asr = 'N/A'
let asrResetTimer = null;
let listenResetTimer = null;
let isPlaying = false;
let isListening = false;
let fuse = null;

// Variables for session data (used by ports 5000 and 5001)
let sessionLast0s = 'N/A';
let sessionLast30s = 'N/A';
let sessionLast5m = 'N/A';
const products = [
    { name: "pizza", keywords: ["food", "pizza", "eat"], video: "pizza.mp4" },
    { name: "Shampoo", keywords: ["shampoo", "hair", "wash"], video: "shampoo.mp4" },
    { name: "Chocolate Bar", keywords: ["chocolate", "snack", "candy"], video: "chacolate.mp4" },
    { name: "Soda", keywords: ["soda", "cola", "drink"], video: "drinks.mp4" },
];

const stopwords = new Set([
    "show", "me", "please", "the", "a", "an", "find", "give", "tell", "is", "what", "which", "to", "for", "of"
]);

/*
--------------------------------------------------------------------------------------------------------------------------------
EDIT BELOW FOR PRESENTATION CHANGES
--------------------------------------------------------------------------------------------------------------------------------
*/

const IMAGE_LOCATION_TOP = 70;
const image_location_top = IMAGE_LOCATION_TOP;
const image_location_left = 90;
const vidPath = 'meet-brightsign.mp4'
let videoZone = null;
let imageContainer = null;

//Enable debug logging
// Set true for debug logging, false for production
const DEBUG = false;
function debugLog(message, ...args) {
    if (DEBUG) {
        console.log(message, ...args);
    }
}

/*
--------------------------------------------------------------------------------------------------------------------------------
EDIT ABOVE FOR PRESENTATION CHANGES
--------------------------------------------------------------------------------------------------------------------------------
*/

function main() {
    debugLog('In Main - Remote Liftoff!');
    // Fetch the image fetchInterval times per second. Uncomment to see the image update in real-time.
    //setInterval(fetchImage, fetchInterval);

    // Set the video zone src to the VideoPath
    videoZone = document.getElementById('video');
    videoZone.src = vidPath;

    // Set the image location on the screen
    imageContainer = document.getElementById('image-container');
    imageContainer.style.left = image_location_left + '%';
    imageContainer.style.top = image_location_top + '%';
    
    //Play default video
    showFallbackImage();

    // Init Fuse
    debugLog('In Main - initFuse');
    initFuse();

    // Bind the UDP server to the specified port
    udpServer.bind(udpPort, () => {
       debugLog(`UDP server listening on port ${udpPort}`);
    });

    // Listen for UDP messages
    udpServer.on('message', (msg, rinfo) => {
        // Parse the incoming message
        handleUdpMessage(msg);
    });
    // Add this to main() function
    window.addEventListener('beforeunload', () => {
        if (listenResetTimer) clearTimeout(listenResetTimer);
        if (asrResetTimer) clearTimeout(asrResetTimer);
        udpServer.close();
    });
}
window.onload = main;

// Functions
function fetchImage() {
    fs.stat(imagePath, (err, stats) => {
        if (err) {
            console.log('Error reading image file:', err);
            return;
        }

        if (stats.mtimeMs > lastImageUpdateTime) {
            lastImageUpdateTime = stats.mtimeMs;
            fs.readFile(imagePath, (err, data) => {
                if (err) {
                    console.log('Error reading image file:', err);
                    return;
                }

                const base64Image = `data:image/jpeg;base64,${data.toString('base64')}`;
                const tempImage = new Image();
                tempImage.onload = () => {
                    imageElement.src = base64Image;
                    imageElement.style.display = 'block';
                };
                tempImage.src = base64Image;
            });
        } else if (Date.now() - lastImageUpdateTime > timeout) {
            console.log('No image update in the last 5 seconds');
            lastImageUpdateTime = Date.now(); // reset
            imageElement.src = 'none';
            imageElement.style.display = 'none';
        }
    });
}

/**
 * Handles incoming UDP messages and updates UI or state variables accordingly.
 *
 * Expected message formats:
 * - For udpPort 5000: "variable:value" (plain text)
 * - For udpPort 5001: JSON string with keys 'all_sessions_count', 'sessions_last_0s', 'sessions_last_30s', 'sessions_last_5m'
 * - For udpPort 5002: JSON string with keys 'faces_in_frame_total', 'faces_attending', 'ASR'
 *
 * @param {Buffer} msg - The UDP message buffer received.
 */
function handleUdpMessage(msg) {
    const message = msg.toString();
    debugLog(`Received message: ${message}`);
    // Update the corresponding variable

    if (udpPort === 5000) {
        const [variable, value] = message.split(':');
        if (variable === 'session_last_0s') {
            sessionLast0s = value;
        } else if (variable === 'session_last_30s') {
            sessionLast30s = value;
        } else if (variable === 'session_last_5m') {
            sessionLast5m = value;
        }
    } else if (udpPort === 5001) {
        try {
            // Parse the JSON message
            const data = JSON.parse(message);
            // Validate the structure
            if (
                typeof data === 'object' &&
                'all_sessions_count' in data &&
                'sessions_last_0s' in data &&
                'sessions_last_30s' in data &&
                'sessions_last_5m' in data
            ) {
                // Update the variables
                sessionLast0s = data.sessions_last_0s;
                sessionLast30s = data.sessions_last_30s;
                sessionLast5m = data.sessions_last_5m;
            } else {
                console.log('Invalid JSON structure for port 5001.');
            }
        } catch (error) {
            console.log('Error parsing JSON for port 5001:', error.message);
        }
    } else if (udpPort === 5002) {
        try {
            // Parse the JSON message
            const data = JSON.parse(message);
            if (
                typeof data === 'object' &&
                'faces_in_frame_total' in data &&
                'faces_attending' in data &&
                'ASR' in data
            ) {
                // Update the variables
                total_faces = data.faces_in_frame_total;
                attending_faces = data.faces_attending;
                if (data.ASR === "Listening..." && !isListening) {
                    if (isPlaying) {
                        debugLog("Ignoring Listening... prompt: Video/ASR in progress");
                        return;
                    }
                    debugLog("Detected the listening prompt!");
                    // Clear any existing timer
                    if (listenResetTimer) clearTimeout(listenResetTimer);
                    if (asrResetTimer) clearTimeout(asrResetTimer);
                    isListening = true;
                    display_asr = data.ASR;
                    updateBanner();

                    // Set a new timer to clear Listening message after 5 seconds
                    listenResetTimer = setTimeout(() => {
                        display_asr = "";
                        isListening = false;
                        updateBanner();
                    }, 5000);
                } else if (data.ASR !== "Listening...") {
                    isPlaying = true;
                    isListening = false;
                    // Update the banner with the new values
                    console.log("Received ASR :", data.ASR);
                    // Clear any existing timer
                    if (listenResetTimer) clearTimeout(listenResetTimer);
                    if (asrResetTimer) clearTimeout(asrResetTimer);
                    display_asr = data.ASR;
                    updateBanner();
                    searchProduct(data.ASR);
                }
            } else {
                console.log('Invalid JSON structure for port 5002.');
            }
        } catch (error) {
            console.log('Error parsing JSON for port 5002:', error.message);
        }
    } else {
        console.log(`Unsupported UDP port: ${udpPort}`);
    }
}

// Function to update the displayed values
function updateBanner() {
    if (display_asr === "Listening...") {
        debugLog("updateBanner:Listening prompt detected, updating banner");
        udpMessageElement.textContent = display_asr;
    } else {
        debugLog("updateBanner: display_asr =", display_asr);
        udpMessageElement.textContent = display_asr ? `ASR: ${display_asr}` : "";
    }
}

function simpleStem(word) {
    // Remove common plural forms
    return word.replace(/(es|s)$/, '');
}

function extractProductKeywords(asr) {
    return asr
        .replace(/[^\w\s]/g, ' ')
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word && !stopwords.has(word))
        .map(simpleStem);
}

function initFuse() {
    fuse = new Fuse(products, {
        keys: ['name', 'keywords'],
        threshold: 0.4,
        includeScore: true
    });
}

function searchProduct(asr) {
    const keywords = extractProductKeywords(asr);
    let bestMatch = null;
    let bestScore = 1.0;

    for (const w of keywords) {
        let res = fuse.search(w);
        if (res.length && res[0].score < bestScore && res[0].score < 0.5) {
            bestScore = res[0].score;
            bestMatch = res[0].item;
        }
    }

    if (bestMatch) {
        playVideo(bestMatch.video);
        debugLog(`Playing video for: ${bestMatch.name}`);
        // Set a new timer to clear ASR after 10 seconds
        asrResetTimer = setTimeout(() => {
            display_asr = "";
            updateBanner();
            showFallbackImage();
        }, 10000);
    } else {
        debugLog("No search results found");
        asrResetTimer = setTimeout(() => {
            display_asr = "";
            updateBanner();
            showFallbackImage();
            isPlaying = false;
        }, 1000); // 1 seconds delay.
    }
}

function playVideo(newVideoPath) {
    const videoZone = document.getElementById('video');
    videoZone.style.display = 'block';
    videoZone.src = newVideoPath;
    videoZone.loop = false;
    videoZone.load();
    isPlaying = true;
    videoZone.onended = function() {
        isPlaying = false;
        display_asr = "";
        updateBanner();
        showFallbackImage();
    };
    videoZone.play();
}

function showFallbackImage() {
    const videoZone = document.getElementById('video');
    videoZone.style.display = 'block';
    videoZone.src = "meet-brightsign.mp4";
    videoZone.loop = true;
    videoZone.load();
    videoZone.onended = null;
    videoZone.play();
}