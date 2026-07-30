let sessionId = localStorage.getItem('chatSessionId');
if (!sessionId) {
    sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chatSessionId', sessionId);
}

const socket = io({ auth: { sessionId } });

const leaveBtn = document.getElementById('leave-btn');
const setupCard = document.getElementById('setup-card');
const startMatchBtn = document.getElementById('start-match-btn');
const secretInput = document.getElementById('secret-key');
const chatBox = document.getElementById('chat-box');
const inputArea = document.getElementById('input-area');
const form = document.getElementById('input-area');
const input = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

// Modal 元件
const leaveModal = document.getElementById('leave-modal');
const modalTitle = document.getElementById('modal-title');
const leaveVerifyInput = document.getElementById('leave-verify-input');
const reportBtn = document.getElementById('report-btn');
const confirmLeaveBtn = document.getElementById('confirm-leave-btn');
const modalCloseBtn = document.getElementById('modal-close-btn');

let inRoom = false;
let msgCount = 0;

window.addEventListener('DOMContentLoaded', () => {
    const nickname = localStorage.getItem('userNickname');
    const gender = localStorage.getItem('userGender');
    // 如果沒有填寫過資料，強迫退回首頁 index.html
    if (!nickname || !gender) window.location.href = 'index.html';
});

startMatchBtn.addEventListener('click', () => {
    const nickname = localStorage.getItem('userNickname');
    const gender = localStorage.getItem('userGender');
    const secretKey = secretInput.value;

    setupCard.style.display = 'none';
    chatBox.style.display = 'flex';
    inputArea.style.display = 'flex';
    leaveBtn.style.display = 'inline-block';

    chatBox.innerHTML = '';
    msgCount = 0;
    socket.emit('start match', { nickname, gender, secretKey });
    appendSystemMsg('尋找對象中，請稍候...');
});

// 點擊離開按鈕：彈出 Modal
leaveBtn.addEventListener('click', () => {
    leaveVerifyInput.value = '';

    if (msgCount >= 30) {
        modalTitle.innerText = '雙方聊天已達 30 句，請輸入 Leave 驗證後離開：';
        leaveVerifyInput.style.display = 'block';
    } else {
        modalTitle.innerText = '是否確定離開聊天室？';
        leaveVerifyInput.style.display = 'none';
    }

    leaveModal.style.display = 'flex';
});

modalCloseBtn.addEventListener('click', () => {
    leaveModal.style.display = 'none';
});

reportBtn.addEventListener('click', () => {
    const reason = prompt('請輸入檢舉或回報原因：');
    if (reason && reason.trim()) {
        alert('感謝您的回報，我們會盡快審核！');
    }
});

confirmLeaveBtn.addEventListener('click', () => {
    if (msgCount >= 30) {
        if (leaveVerifyInput.value !== 'Leave') {
            alert('驗證碼輸入錯誤！請輸入 Leave 才能離開。');
            return;
        }
    }

    socket.emit('leave room');
    window.location.reload();
});

socket.on('status', (msg) => {
    appendSystemMsg(msg);
});

socket.on('matched', (data) => {
    setChatState(true);
    msgCount = 0;
    const secretNotice = data.secretKey !== 'default' ? `（暗號：${data.secretKey}）` : '';
    const genderSign = data.partner.gender === 'male' ? '♂ (男)' : '♀ (女)';
    appendSystemMsg(`🎉 配對成功${secretNotice}！對方是【${data.partner.nickname} ${genderSign}】，連線成功，可以開始聊天了！`);
});

socket.on('rejoined', (data) => {
    setupCard.style.display = 'none';
    chatBox.style.display = 'flex';
    inputArea.style.display = 'flex';
    leaveBtn.style.display = 'inline-block';
    setChatState(true);

    msgCount = data.msgCount;
    const genderSign = data.partner.gender === 'male' ? '♂ (男)' : '♀ (女)';

    appendSystemMsg(`🔄 您已重新連線！與【${data.partner.nickname} ${genderSign}】的聊天繼續。`);

    data.history.forEach(msg => {
        renderMessage(msg.senderId, msg.senderName, msg.text);
    });
});

socket.on('partner left', () => {
    setChatState(false);
    appendSystemMsg('❌ 陌生人已離開聊天室。按下上方「離開」按鈕可重新開始。');
});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value.trim() && inRoom) {
        socket.emit('chat message', input.value);
        input.value = '';
    }
});

socket.on('chat message', (data) => {
    msgCount = data.msgCount;
    renderMessage(data.senderId, data.senderName, data.text);
});

function renderMessage(senderId, senderName, text) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');

    if (senderId === sessionId) {
        msgDiv.classList.add('my-message');
        msgDiv.textContent = text;
    } else {
        msgDiv.classList.add('other-message');
        const nameSpan = document.createElement('span');
        nameSpan.classList.add('sender-name');
        nameSpan.textContent = senderName;
        msgDiv.appendChild(nameSpan);
        msgDiv.appendChild(document.createTextNode(text));
    }

    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function setChatState(active) {
    inRoom = active;
    input.disabled = !active;
    sendBtn.disabled = !active;
    input.placeholder = active ? "輸入訊息..." : "配對已結束...";
}

function appendSystemMsg(text) {
    const sysDiv = document.createElement('div');
    sysDiv.classList.add('system-msg');
    sysDiv.textContent = text;
    chatBox.appendChild(sysDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}
