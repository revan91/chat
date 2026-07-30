const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

// 預設訪問根目錄時，開啟 index.html (原本的 Home.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

let waitingQueues = {};
const sessions = new Map();
const rooms = new Map();

io.on('connection', (socket) => {
  const sessionId = socket.handshake.auth.sessionId;
  if (!sessionId) return;

  let session = sessions.get(sessionId);
  if (session) {
    session.socketId = socket.id;
    if (session.disconnectTimer) {
      clearTimeout(session.disconnectTimer);
      session.disconnectTimer = null;
    }

    if (session.roomId && rooms.has(session.roomId)) {
      socket.join(session.roomId);
      const room = rooms.get(session.roomId);

      const partnerId = room.users.find(id => id !== sessionId);
      const partner = sessions.get(partnerId);

      if (partner) {
        socket.emit('rejoined', {
          partner: { nickname: partner.nickname, gender: partner.gender },
          msgCount: room.msgCount,
          history: room.history
        });
        socket.to(session.roomId).emit('status', `對方剛剛重新整理了，已恢復連線。`);
      }
    }
  } else {
    session = { sessionId, socketId: socket.id, roomId: null };
    sessions.set(sessionId, session);
  }

  socket.on('start match', (data) => {
    session.nickname = typeof data === 'object' ? (data.nickname || '匿名者') : '匿名者';
    session.gender = typeof data === 'object' ? (data.gender || 'unknown') : 'unknown';
    const rawSecret = typeof data === 'object' ? data.secretKey : data;
    const key = rawSecret && rawSecret.trim() !== '' ? rawSecret.trim().toLowerCase() : 'default';

    if (!session.roomId) {
      if (!waitingQueues[key]) waitingQueues[key] = [];
      if (!waitingQueues[key].some(sId => sId === sessionId)) {
        waitingQueues[key].push(sessionId);
        socket.emit('status', `正在為您尋找陌生人...`);
        tryMatch(key);
      }
    }
  });

  socket.on('chat message', (msg) => {
    if (session.roomId && rooms.has(session.roomId)) {
      const room = rooms.get(session.roomId);
      room.msgCount++;

      const messageData = {
        senderId: sessionId,
        senderName: session.nickname,
        text: msg,
        msgCount: room.msgCount
      };

      room.history.push(messageData);
      if (room.history.length > 100) room.history.shift();

      io.to(session.roomId).emit('chat message', messageData);
    }
  });

  socket.on('leave room', () => {
    if (session.roomId) {
      const roomId = session.roomId;
      socket.to(roomId).emit('partner left');
      socket.leave(roomId);

      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        const partnerId = room.users.find(id => id !== sessionId);
        const partnerSession = sessions.get(partnerId);
        if (partnerSession) partnerSession.roomId = null;
        rooms.delete(roomId);
      }
      session.roomId = null;
    }
  });

  socket.on('disconnect', () => {
    for (const key in waitingQueues) {
      waitingQueues[key] = waitingQueues[key].filter(sId => sId !== sessionId);
    }

    session.disconnectTimer = setTimeout(() => {
      if (session.roomId && rooms.has(session.roomId)) {
        const roomId = session.roomId;
        io.to(roomId).emit('partner left');

        const room = rooms.get(roomId);
        const partnerId = room.users.find(id => id !== sessionId);
        const partnerSession = sessions.get(partnerId);
        if (partnerSession) partnerSession.roomId = null;

        rooms.delete(roomId);
        session.roomId = null;
      }
    }, 15000);
  });
});

function tryMatch(key) {
  const queue = waitingQueues[key];
  if (!queue) return;

  while (queue.length >= 2) {
    const user1Id = queue.shift();
    const user2Id = queue.shift();

    const session1 = sessions.get(user1Id);
    const session2 = sessions.get(user2Id);

    const isOnline = (sess) => sess && sess.socketId && !sess.disconnectTimer;

    if (isOnline(session1) && isOnline(session2)) {
      const roomId = `room_${user1Id}_${user2Id}`;
      const room = { msgCount: 0, history: [], users: [user1Id, user2Id] };
      rooms.set(roomId, room);

      session1.roomId = roomId;
      session2.roomId = roomId;

      const socket1 = io.sockets.sockets.get(session1.socketId);
      const socket2 = io.sockets.sockets.get(session2.socketId);

      if (socket1) socket1.join(roomId);
      if (socket2) socket2.join(roomId);

      if (socket1) socket1.emit('matched', { secretKey: key, partner: { nickname: session2.nickname, gender: session2.gender } });
      if (socket2) socket2.emit('matched', { secretKey: key, partner: { nickname: session1.nickname, gender: session1.gender } });
    } else {
      if (isOnline(session1)) queue.unshift(user1Id);
      if (isOnline(session2)) queue.unshift(user2Id);
    }
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`伺服器啟動完成，請存取: http://localhost:${PORT}`);
});