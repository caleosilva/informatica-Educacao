const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const PORT = 3000;

// Serve os arquivos estáticos (nossa página HTML e JS) da pasta 'public'
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Lógica de sinalização do WebRTC
io.on('connection', (socket) => {
  console.log('Um usuário se conectou');

  // Lógica de "salas". Vamos usar uma sala fixa para este exemplo.
  const room = 'stream-room';

  socket.on('join', (roomName) => {
    socket.join(roomName);
    console.log(`Usuário ${socket.id} entrou na sala ${roomName}`);
  });

  // Retransmite a "oferta" (do celular) para outros na sala (o PC)
  socket.on('offer', (offer, roomName) => {
    console.log('Recebido offer, retransmitindo...');
    socket.to(roomName).emit('offer', offer);
  });

  // Retransmite a "resposta" (do PC) de volta para o originador (o celular)
  socket.on('answer', (answer, roomName) => {
    console.log('Recebido answer, retransmitindo...');
    socket.to(roomName).emit('answer', answer);
  });

  // Retransmite os "candidatos ICE" (caminhos de rede) entre os dois
  socket.on('ice-candidate', (candidate, roomName) => {
    // console.log('Recebido ice-candidate, retransmitindo...'); // Descomente para debug
    socket.to(roomName).emit('ice-candidate', candidate);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});