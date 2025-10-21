const socket = io();
const roomName = 'stream-room'; // Nome da sala fixa

// Configuração dos servidores STUN (necessários para descobrir o caminho de rede)
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' } // Servidor STUN público do Google
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

    // Define as restrições para pedir a câmera traseira
    const constraints = {
        video: { 
            facingMode: 'environment' // 'environment' = câmera traseira
        },
        audio: true
    };

    // Pede acesso à câmera com as novas restrições
    try {
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
        console.error("Erro ao pegar a câmera traseira, tentando qualquer câmera...", err);
        // Se falhar (ex: no PC), tenta pegar qualquer câmera de vídeo
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    }
    
    localVideo.srcObject = localStream;

    // Entra na sala de sinalização
    socket.emit('join', roomName);

    // Cria a conexão P2P
    peerConnection = new RTCPeerConnection(configuration);

    // Adiciona as trilhas de áudio e vídeo à conexão
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Ouve por candidatos ICE (caminhos de rede) e os envia para o outro lado
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', event.candidate, roomName);
        }
    };

    // Cria uma "oferta" de conexão
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Envia a oferta para o servidor de sinalização
    socket.emit('offer', offer, roomName);
};

// 2. Lógica do "PC/Monitor" (Quem assiste)
watchButton.onclick = async () => {
    console.log('Aguardando stream...');
    // Entra na sala
    socket.emit('join', roomName);
};

// 3. Lógica de Sinalização (Comum a ambos)

// Ouve por 'oferta' (O PC/Monitor recebe)
socket.on('offer', async (offer) => {
    if (!peerConnection) {
        console.log('Recebendo oferta...');
        peerConnection = new RTCPeerConnection(configuration);

        // Ouve por candidatos ICE (caminhos de rede) e os envia
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', event.candidate, roomName);
            }
        };

        // Quando a trilha de vídeo remota chegar, exibe-a
        peerConnection.ontrack = (event) => {
            console.log('Recebendo trilha de vídeo!');
            remoteVideo.srcObject = event.streams[0];
        };
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // Cria uma "resposta" à oferta
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    // Envia a resposta de volta
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