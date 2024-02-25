export function showErrorPopup(message) {
    const container = document.getElementById('errorPopupContainer');
    const popup = document.createElement('div');
    popup.classList.add('error-popup');
    popup.textContent = message;
    container.appendChild(popup);

    setTimeout(() => {
        popup.classList.add('fade-out');
        popup.addEventListener('animationend', () => {
            popup.remove();
        });
    }, 2000);
}