
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
