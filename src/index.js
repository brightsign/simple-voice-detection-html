// Ensure we can use Node.js APIs
const fs = require('fs');
const dgram = require('dgram');
const Fuse = require('fuse.js');

const imagePath = '/tmp/output.jpg';
const imageElement = document.getElementById('image');
const udpMessageElement = document.getElementById('udp-messages');
let lastImageUpdateTime = Date.now(); // Initialize to current time to display the first image

const timeout = 5000; // ms

const imageUpdateInterval = 30; // ms - 30 fps
const oversampling_rate = 1; // sample at N times the update frequency
const fetchInterval = imageUpdateInterval / oversampling_rate;

const udpPort = 5002;
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

/*
--------------------------------------------------------------------------------------------------------------------------------
EDIT ABOVE FOR PRESENTATION CHANGES
--------------------------------------------------------------------------------------------------------------------------------
*/

function main() {
    console.log('In Main - Remote Liftoff!');
    // Fetch the image fetchInterval times per second
    setInterval(fetchImage, fetchInterval);

    // Set the video zone src to the VideoPath
    const videoZone = document.getElementById('video');
    videoZone.src = vidPath;

    // Set the image location on the screen
    const imageContainer = document.getElementById('image-container');
    imageContainer.style.left = image_location_left + '%';
    imageContainer.style.top = image_location_top + '%';
    
    //Play default video
    showFallbackImage();

    // Init Sql database
    console.log('In Main - initFuse');
    initFuse();

    // Bind the UDP server to the specified port
    udpServer.bind(udpPort, () => {
       console.log(`UDP server listening on port ${udpPort}`);
    });

    // Listen for UDP messages
    udpServer.on('message', (msg, rinfo) => {
        // Parse the incoming message
        handleUdpMessage(msg);
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

function handleUdpMessage(msg) {
    const message = msg.toString();
    console.log(`Received message: ${message}`);
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
            console.log('Invalid JSON structure.');
        }
    } else if (udpPort === 5002) {
        // Parse the JSON message
        const data = JSON.parse(message);
        if (
            typeof data === 'object' &&
            'faces_in_frame_total' in data &&
            'faces_attending' in data && 'ASR' in data
        ) {
            // Update the variables
            total_faces = data.faces_in_frame_total;
            attending_faces = data.faces_attending;
	    if (data.ASR === "Listening..." && !isListening)
            {
		if (isPlaying) {
                    console.log("Ignoring Listening... prompt: Video/ASR in progress");
                    return;
                }
                console.log("Detected the listening prompt!");
		isListening = true;
                display_asr = data.ASR;
                updateBanner();
                // Clear any existing timer
                if (listenResetTimer) clearTimeout(listenResetTimer);
                if (asrResetTimer) clearTimeout(asrResetTimer);

                // Set a new timer to clear Listening message after 2 seconds
                listenResetTimer = setTimeout(() => {
                display_asr = "";
                updateBanner();
                }, 2000);

	    }
            else
            {
		isPlaying = true;
		isListening = false;
                // Update the banner with the new values
		console.log("Received ASR :", data.ASR);
                display_asr = data.ASR;
                updateBanner();
                searchProduct(data.ASR);
                // Clear any existing timer
                if (listenResetTimer) clearTimeout(listenResetTimer);
                if (asrResetTimer) clearTimeout(asrResetTimer);

                // Set a new timer to clear ASR after 20 seconds
                asrResetTimer = setTimeout(() => {
		//isPlaying = false;
                display_asr = "";
                updateBanner();
                showFallbackImage();
                }, 20000);
            }

        } else {
            console.log('Invalid JSON structure.');
        }
    }
}

// Function to update the displayed values
function updateBanner() {
    if (display_asr === "Listening...") {
        udpMessageElement.textContent = display_asr;
    } else {
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
        console.log(`Playing video for: ${bestMatch.name}`);
    } else {
        console.log("No search results found");
	setTimeout(() => {
            display_asr = "";
            updateBanner();
            showFallbackImage();
	    isPlaying = false;
        }, 3000); // 3 seconds delay, adjust as needed
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
        showFallbackImage();  // Play fallback video *after* product video ends
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
