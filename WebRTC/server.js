const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const PORT = 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
  console.log('Um usuário se conectou');

  const room = 'stream-room';

  socket.on('join', (roomName) => {
    socket.join(roomName);
    console.log(`Usuário ${socket.id} entrou na sala ${roomName}`);
  });

  socket.on('offer', (offer, roomName) => {
    console.log('Recebido offer, retransmitindo...');
    socket.to(roomName).emit('offer', offer);
  });

  socket.on('answer', (answer, roomName) => {
    console.log('Recebido answer, retransmitindo...');
    socket.to(roomName).emit('answer', answer);
  });

  socket.on('ice-candidate', (candidate, roomName) => {
    socket.to(roomName).emit('ice-candidate', candidate);
  });

  // ====================== ADICIONE ESTE BLOCO ======================
  // Ouve pelo "comando de filtro" do celular e retransmite para o PC
  socket.on('filter-change', (filterName, roomName) => {
    console.log(`Comando de filtro recebido: ${filterName}`);
    // Envia o comando para todos na sala (o PC), exceto o remetente (o celular)
    socket.to(roomName).emit('filter-change', filterName);
  });
  // =================================================================
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log('Para testar na sua rede, use seu IP local. Ex: http://192.168.1.10:3000');
});