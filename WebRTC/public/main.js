const socket = io();
const roomName = 'stream-room'; // Nome da sala fixa

// Configuração dos servidores STUN
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

let peerConnection;
let localStream;
let currentFilter = 'none'; // Variável global para guardar o filtro

// Elementos do HTML
const startButton = document.getElementById('startStream');
const watchButton = document.getElementById('watchStream');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// 1. Lógica do "Celular" (Quem transmite)
startButton.onclick = async () => {
    console.log('Iniciando stream...');

    // Pega os elementos de controle (Zoom e Filtros)
    const zoomSlider = document.getElementById('zoomSlider');
    const zoomControls = document.getElementById('zoom-controls');
    const filterControls = document.getElementById('filter-controls');
    const btnNormal = document.getElementById('btnNormal');
    const btnContrast = document.getElementById('btnContrast');
    const btnYellow = document.getElementById('btnYellow'); // <-- ADICIONADO

    // Define as restrições para pedir a câmera traseira
    const constraints = {
        video: { facingMode: 'environment' },
        audio: true
    };

    try {
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
        console.error("Erro ao pegar a câmera traseira, tentando qualquer câmera...", err);
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    }
    
    // Mostra o stream "cru" no vídeo local
    localVideo.srcObject = localStream;
    localVideo.play();

    // --- LÓGICA DO CANVAS (O "INTERMEDIÁRIO") ---
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const videoTrack = localStream.getVideoTracks()[0];

    localVideo.onloadedmetadata = () => {
        canvas.width = localVideo.videoWidth;
        canvas.height = localVideo.videoHeight;
        drawLoop();

        // --- LÓGICA DE CONEXÃO ---
        const canvasStream = canvas.captureStream();
        canvasStream.addTrack(localStream.getAudioTracks()[0]);

        socket.emit('join', roomName);
        peerConnection = new RTCPeerConnection(configuration);

        canvasStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, canvasStream);
        });

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', event.candidate, roomName);
            }
        };

        peerConnection.createOffer()
            .then(offer => peerConnection.setLocalDescription(offer))
            .then(() => {
                socket.emit('offer', peerConnection.localDescription, roomName);
            });
    };

    function drawLoop() {
        if (!ctx) return;
        
        // Aplica o filtro atual ao contexto do canvas
        ctx.filter = currentFilter; 
        
        ctx.drawImage(localVideo, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawLoop);
    }

    // --- LÓGICA DOS CONTROLES (ZOOM E FILTRO) ---
    try {
        const capabilities = videoTrack.getCapabilities();
        console.log("CAPACIDADES DA CÂMERA:", capabilities); 
        if ('zoom' in capabilities) {
            zoomControls.style.display = 'block';
            zoomSlider.min = capabilities.zoom.min;
            zoomSlider.max = capabilities.zoom.max;
            zoomSlider.step = capabilities.zoom.step;
            const currentSettings = videoTrack.getSettings();
            if(currentSettings.zoom) zoomSlider.value = currentSettings.zoom;

            zoomSlider.oninput = () => {
                videoTrack.applyConstraints({ advanced: [ { zoom: zoomSlider.value } ] });
            };
        } else {
            console.log('Zoom não é suportado.');
        }
    } catch (e) { console.error("Erro no Zoom:", e); }

    // --- LÓGICA DOS FILTROS (Com o Filtro Amarelo) ---
    filterControls.style.display = 'block';

    btnNormal.onclick = () => {
        currentFilter = 'none';
        console.log("Filtro aplicado:", currentFilter); 
    };
    btnContrast.onclick = () => {
        currentFilter = 'contrast(2) grayscale(1)';
        console.log("Filtro aplicado:", currentFilter); 
    };
    
    // --- LÓGICA DO BOTÃO ADICIONADA ---
    btnYellow.onclick = () => {
        // 'sepia(1)' aplica o tom amarelado
        // 'contrast(1.7)' aumenta o contraste para manter a legibilidade
        currentFilter = 'sepia(1) contrast(1.7)';
        console.log("Filtro aplicado:", currentFilter);
    };
    // ----------------------------------
    
};

// 2. Lógica do "PC/Monitor" (Quem assiste)
watchButton.onclick = async () => {
    console.log('Aguardando stream...');
    socket.emit('join', roomName);
};

// 3. Lógica de Sinalização (Comum a ambos)
socket.on('offer', async (offer) => {
    if (!peerConnection) {
        console.log('Recebendo oferta...');
        peerConnection = new RTCPeerConnection(configuration);

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', event.candidate, roomName);
            }
        };

        peerConnection.ontrack = (event) => {
            console.log('Recebindo trilha de vídeo!');
            remoteVideo.srcObject = event.streams[0];
        };
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer, roomName);
});

// Ouve por 'resposta' (O Celular recebe)
socket.on('answer', async (answer) => {
    console.log('Recebendo resposta...');
    if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
});

// Ouve por 'candidatos ICE' (Ambos recebem)
socket.on('ice-candidate', async (candidate) => {
    if (peerConnection && candidate) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.error('Erro ao adicionar candidato ICE:', e);
        }
    }
});