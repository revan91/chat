document.addEventListener('DOMContentLoaded', () => {
    // ====== 1. 側邊選單控制邏輯 ======
    const toggleBtn = document.getElementById('toggleBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    if (toggleBtn && sidebar && overlay) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // ====== 2. 一鍵複製帳號功能 ======
    const copyBtn = document.getElementById('copyBtn');
    const accountNumber = document.getElementById('accountNumber');

    if (copyBtn && accountNumber) {
        copyBtn.addEventListener('click', () => {
            // 取得文字並移除連字號
            const textToCopy = accountNumber.innerText.replace(/-/g, '');
            
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalHtml = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> 已複製';
                copyBtn.style.backgroundColor = '#2ecc71';

                setTimeout(() => {
                    copyBtn.innerHTML = originalHtml;
                    copyBtn.style.backgroundColor = '#35B4CE';
                }, 2000);
            }).catch(err => {
                alert('複製失敗，請手動複製');
            });
        });
    }
});