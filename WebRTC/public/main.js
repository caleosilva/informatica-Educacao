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
    const btnYellow = document.getElementById('btnYellow');
    const btnSharpen = document.getElementById('btnSharpen'); 

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

    // --- LÓGICA DO CANVAS FOI REMOVIDA ---
    // (Isso remove o processamento do celular e o delay)

    const videoTrack = localStream.getVideoTracks()[0];

    // --- LÓGICA DE CONEXÃO (SIMPLIFICADA) ---
    socket.emit('join', roomName);
    peerConnection = new RTCPeerConnection(configuration);

    // Envia o stream "cru" da câmera, sem canvas
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
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


    // --- LÓGICA DOS CONTROLES (ZOOM) ---
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

    // --- LÓGICA DOS FILTROS (AGORA É UM CONTROLE REMOTO) ---
    filterControls.style.display = 'block';

    btnNormal.onclick = () => {
        console.log("Enviando comando: 'none'");
        socket.emit('filter-change', 'none', roomName);
    };
    btnContrast.onclick = () => {
        console.log("Enviando comando: 'contrast'");
        socket.emit('filter-change', 'contrast', roomName);
    };
    btnYellow.onclick = () => {
        console.log("Enviando comando: 'yellow'");
        socket.emit('filter-change', 'yellow', roomName);
    };
    btnSharpen.onclick = () => {
        console.log("Enviando comando: 'sharpen'");
        socket.emit('filter-change', 'sharpen', roomName);
    };
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

socket.on('answer', async (answer) => {
    console.log('Recebendo resposta...');
    if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
});

socket.on('ice-candidate', async (candidate) => {
    if (peerConnection && candidate) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.error('Erro ao adicionar candidato ICE:', e);
        }
    }
});

// ========================================================
// 4. LÓGICA DE FILTRO (RECEPTOR)
// O PC "ouve" o comando de filtro vindo do celular
// ========================================================
socket.on('filter-change', (filterName) => {
    console.log(`Comando de filtro recebido: ${filterName}`);
    
    // Aplica o filtro CSS no vídeo remoto (PC)
    if (filterName === 'contrast') {
        remoteVideo.style.filter = 'contrast(2) grayscale(1)';
    } else if (filterName === 'yellow') {
        remoteVideo.style.filter = 'sepia(1) contrast(1.7)';
    } else if (filterName === 'sharpen') {
        remoteVideo.style.filter = 'contrast(1.5) brightness(0.95)';
    } else if (filterName === 'none') {
        remoteVideo.style.filter = 'none';
    }
});