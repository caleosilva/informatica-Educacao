// server.js - Servidor de Sinalização
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const rooms = new Map();

app.get('/', (req, res) => {
  res.json({ 
    status: 'Chat P2P Signaling Server Running',
    rooms: rooms.size,
    connections: io.sockets.sockets.size
  });
});

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  socket.on('join-room', (pin) => {
    const roomPin = pin.toString();
    
    if (!rooms.has(roomPin)) {
      rooms.set(roomPin, []);
    }

    const room = rooms.get(roomPin);

    if (room.length >= 2) {
      socket.emit('room-full');
      return;
    }

    room.push(socket.id);
    socket.join(roomPin);
    socket.roomPin = roomPin;

    console.log(`Socket ${socket.id} entrou na sala ${roomPin}`);

    socket.emit('joined-room', {
      pin: roomPin,
      position: room.length
    });

    if (room.length === 2) {
      const [peer1, peer2] = room;
      
      console.log(`Sala ${roomPin} completa. Peer ${peer1} iniciará a oferta.`);
      
      io.to(peer1).emit('ready-to-connect', { 
        remotePeerId: peer2,
        isInitiator: true 
      });
      
      io.to(peer2).emit('ready-to-connect', { 
        remotePeerId: peer1,
        isInitiator: false 
      });
    }
  });

  socket.on('webrtc-offer', (data) => {
    console.log(`Oferta de ${socket.id} para ${data.target}`);
    io.to(data.target).emit('webrtc-offer', {
      offer: data.offer,
      sender: socket.id
    });
  });

  socket.on('webrtc-answer', (data) => {
    console.log(`Resposta de ${socket.id} para ${data.target}`);
    io.to(data.target).emit('webrtc-answer', {
      answer: data.answer,
      sender: socket.id
    });
  });

  socket.on('ice-candidate', (data) => {
    console.log(`ICE candidate de ${socket.id} para ${data.target}`);
    io.to(data.target).emit('ice-candidate', {
      candidate: data.candidate,
      sender: socket.id
    });
  });

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);

    if (socket.roomPin) {
      const room = rooms.get(socket.roomPin);
      
      if (room) {
        const index = room.indexOf(socket.id);
        if (index > -1) {
          room.splice(index, 1);
        }

        room.forEach(peerId => {
          io.to(peerId).emit('peer-disconnected');
        });

        if (room.length === 0) {
          rooms.delete(socket.roomPin);
          console.log(`Sala ${socket.roomPin} removida`);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Servidor de sinalização rodando na porta ${PORT}`);
});