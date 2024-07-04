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
    if(myPeerConnection) {
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection
            .getSenders()
            .find((sender) => sender.track.kind === "video"); 

        videoSender.replaceTrack(videoTrack);
    }
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

async function initCall() {
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection();
}

async function handleWelcomeSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    await initCall();
    socket.emit("join_room", input.value);
    roomName = input.value;
    input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);


// socket.io listen
socket.on("welcome", async () => {
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log("sent the offer");
    socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
    console.log("received the offer");
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    console.log("sent the answer");
    socket.emit("answer", answer, roomName);
});

socket.on("answer", (answer) => {
    console.log("receive the answer");
    myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
    console.log("receive the candidate");
    myPeerConnection.addIceCandidate(ice);
});


// RTC code
function makeConnection() {
    myPeerConnection = new RTCPeerConnection({
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302", 
                    "stun:stun4.l.google.com:19302", 
                ],
            },    
        ],
    });
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("addstream", handleAddStream);
    myStream 
        .getTracks()
        .forEach((track) => myPeerConnection.addTrack(track, myStream));
        
}

function handleIce(data) {
    console.log("sent the canidate");
    socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
    const peersStream = document.getElementById("peerFace");
    peersStream.srcObject = data.stream;
}


/*
    현재 이슈 : 
    ios에서 실행이 되지 않음
    마이크 mute가 되지 않음 
*/