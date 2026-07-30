
let selectedGender = null;

const btnMale = document.getElementById('btn-male');
const btnFemale = document.getElementById('btn-female');
const nicknameInput = document.getElementById('nickname');
const nextBtn = document.getElementById('next-btn');

btnMale.addEventListener('click', () => {
    selectedGender = 'male';
    btnMale.classList.add('selected');
    btnFemale.classList.remove('selected');
});

btnFemale.addEventListener('click', () => {
    selectedGender = 'female';
    btnFemale.classList.add('selected');
    btnMale.classList.remove('selected');
});

nextBtn.addEventListener('click', () => {
    const nickname = nicknameInput.value.trim();

    if (!nickname) {
        alert('請輸入暱稱！');
        nicknameInput.focus();
        return;
    }

    if (!selectedGender) {
        alert('請選擇您的性別！');
        return;
    }

    // 儲存資料並進入 chat.html 準備配對
    localStorage.setItem('userNickname', nickname);
    localStorage.setItem('userGender', selectedGender);

    window.location.href = 'chat.html';
});
// 取得選單相關元素
const toggleBtn = document.getElementById('toggleBtn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

// 側邊選單開關控制
toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
});

overlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
});

// 性別選擇邏輯 (點擊單選)
const genderBtns = document.querySelectorAll('.gender-btn');
genderBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        genderBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
    });
});