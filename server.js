// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

// 1. 將單一等待佇列改為「密語隊列池」
// 格式如：{ 'default': ['socketA'], 'dcard': ['socketB', 'socketC'] }
let waitingQueues = {};

// 2. 紀錄每一個 Socket 目前在的房間以及使用的密語 (socket.id -> { roomId, secretKey })
const userSessions = new Map();

io.on('connection', (socket) => {
  console.log(`[連線] 使用者已連線: ${socket.id}`);

  // 1. 使用者點擊「開始配對」（可帶入密語 secretKey）
  socket.on('start match', (secretKey) => {
    // 預設密語為 'default' (無密語時的隨機配對)
    const key = secretKey && secretKey.trim() !== '' ? secretKey.trim().toLowerCase() : 'default';

    // 避免重複加入
    if (!userSessions.has(socket.id)) {
      // 若該密語的隊列還不存在，先建立一個空陣列
      if (!waitingQueues[key]) {
        waitingQueues[key] = [];
      }

      // 將使用者加入對應密語的佇列
      if (!waitingQueues[key].includes(socket.id)) {
        waitingQueues[key].push(socket.id);

        const displayKeyMsg = key === 'default' ? '' : `（密語：${key}）`;
        socket.emit('status', `正在為您尋找陌生人${displayKeyMsg}...`);
        console.log(`[佇列] ${socket.id} 加入密語 [${key}] 等待區，該區人數: ${waitingQueues[key].length}`);

        // 觸發該密語分區的配對
        tryMatch(key);
      }
    }
  });

  // 2. 傳送聊天訊息
  socket.on('chat message', (msg) => {
    const session = userSessions.get(socket.id);
    if (session && session.roomId) {
      io.to(session.roomId).emit('chat message', {
        senderId: socket.id,
        text: msg
      });
    }
  });

  // 3. 主動離開
  socket.on('leave room', () => {
    handleLeave(socket);
  });

  // 4. 斷線處理
  socket.on('disconnect', () => {
    console.log(`[斷線] 使用者已離線: ${socket.id}`);

    // 從所有等待佇列中清理這個 Socket
    for (const key in waitingQueues) {
      waitingQueues[key] = waitingQueues[key].filter(id => id !== socket.id);
    }

    handleLeave(socket);
  });
});

// 根據特定的密語 Key 進行 1-on-1 配對
function tryMatch(key) {
  const queue = waitingQueues[key];
  if (!queue) return;

  while (queue.length >= 2) {
    const player1Id = queue.shift();
    const player2Id = queue.shift();

    const socket1 = io.sockets.sockets.get(player1Id);
    const socket2 = io.sockets.sockets.get(player2Id);

    // 確保兩人都還在線上
    if (socket1 && socket2) {
      const roomId = `room_${player1Id}_${player2Id}`;

      socket1.join(roomId);
      socket2.join(roomId);

      // 儲存房間資訊與所使用的密語
      userSessions.set(player1Id, { roomId, secretKey: key });
      userSessions.set(player2Id, { roomId, secretKey: key });

      // 發送配對成功訊息（並告知對方是否使用了相同密語）
      io.to(roomId).emit('matched', { secretKey: key });
      console.log(`[配對成功] 密語 [${key}] 房間 ${roomId} 建立 (成員: ${player1Id}, ${player2Id})`);
    } else {
      // 補回開頭
      if (socket1) queue.unshift(player1Id);
      if (socket2) queue.unshift(player2Id);
    }
  }
}

// 離開房間邏輯
function handleLeave(socket) {
  const session = userSessions.get(socket.id);
  if (session) {
    const { roomId } = session;
    socket.to(roomId).emit('partner left');
    socket.leave(roomId);
    userSessions.delete(socket.id);
    console.log(`[離開] ${socket.id} 離開了房間 ${roomId}`);
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`伺服器運作中: http://localhost:${PORT}`);
});
// server.js (精簡說明修改處)
// ...前面的套件引入與宣告維持不變...

app.use(express.static(path.join(__dirname)));

// 預設進入根目錄時，開啟 Home.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Home.html'));
});

// 監聽 start match 時，接收傳入的 userInfo { nickname, gender, secretKey }
io.on('connection', (socket) => {

  socket.on('start match', (data) => {
    // data 包含 { nickname, gender, secretKey }
    const nickname = data?.nickname || '匿名者';
    const gender = data?.gender || 'unknown';
    const secretKey = data?.secretKey;
    const key = secretKey && secretKey.trim() !== '' ? secretKey.trim().toLowerCase() : 'default';

    if (!userSessions.has(socket.id)) {
      if (!waitingQueues[key]) waitingQueues[key] = [];

      // 將使用者的資訊連同 socket.id 存入佇列
      if (!waitingQueues[key].some(item => item.id === socket.id)) {
        waitingQueues[key].push({ id: socket.id, nickname, gender });
        socket.emit('status', '正在為您尋找陌生人...');
        tryMatch(key);
      }
    }
  });

  // ...其餘配對 logic 中，配對成功時把對方的 (nickname, gender) 發送給彼此...
});