const socket = io();

const myFace = document.getElementById("myFace");
const call  = document.getElementById("call");
call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let roomName = "";
let myPeerConnection;

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach((camera) => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if (currentCamera === camera.label) {
                option.selected = true;
            }
            camerasSelect.appendChild(option);
        });



    } catch(e) {
        console.log(e);
    }
}

async function getMedia(deviceId) {
    const initalConstrains = {
        audio: true,
        video: { facingMode: "user" },
    };
    const cameraConstrains = {
        audio: true,
        video: { deviceId: { exact: deviceId } },
    };

    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId ? cameraConstrains : initalConstrains
        );
        myFace.srcObject = myStream;
        if(!deviceId) {
            await getCameras();
        }
    } catch(e) {
        console.log(e);
    }
}

// camera change
const camerasSelect = document.getElementById("cameras");

async function handleCameraChange() {
    await getMedia(camerasSelect.value);
}

camerasSelect.addEventListener("input", handleCameraChange);

// Mute Btn 
const muteBtn = document.getElementById("mute");

function handleMuteClick() {
    myStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));

    if(!muted) {
        muteBtn.innerText = "Unmute";
        muted = true;
    } else {
        muteBtn.innerText = "Mute";
        muted = false;
    }
}

muteBtn.addEventListener("click", handleMuteClick);

// Camera
const cameraBtn = document.getElementById("camera");

function handleCameraClick() {
    myStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));
    if(cameraOff) { cameraBtn.innerText = "Turnn Camera Off";
        cameraOff
         = false;
    } else {
        cameraBtn.innerText = "Turnn Camera On";
        cameraOff = false;
    }
}

cameraBtn.addEventListener("click", handleCameraClick);

// div# welcome 
const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function startMedia() {
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection();
}

function handleWelcomeSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    socket.emit("join_room", input.value, startMedia);
    roomName = input.value;
    input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);


// socket.io listen
socket.on("welcome", async () => {
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    socket.emit("offer", offer, roomName);
})

socket.on("offer", (offer) => {
    // TODO ... 
})


// RTC code
function makeConnection() {
    myPeerConnection = new RTCPeerConnection();
    myStream 
        .getTracks()
        .forEach((track) => myPeerConnection.addTrack(track, myStream));
        
}