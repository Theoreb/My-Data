import { encrypt, encodeCiphertext, encodeBlobToBase64} from './encryption.js';

async function crypter(username, password, content) {
    const chunkSize = 1024 * 256;
    const encryptedChunks = [];

    const progressBar = document.getElementById('fileProgress');
  
    async function processChunk(data) {
      const dataToEncrypt = await encodeBlobToBase64(data);
  
      const encrypted = await encrypt(dataToEncrypt, username, password);
      const encryptedBase64 = encodeCiphertext(encrypted.ciphertext);
      encryptedChunks.push(encryptedBase64);
    };
    for (let i = 0; i < content.size; i += chunkSize) {
      const chunk = content.slice(i, i + chunkSize);
      await processChunk(chunk);
      progressBar.value = (i + 1) / content.size * 100
    }
  
    const concatenatedChunks = new Blob(encryptedChunks, { type: 'application/octet-stream' });
    return concatenatedChunks;
}

window.processFileWithCredentials = () => {
    const fileInput = document.getElementById('fileInput');
    let file = fileInput.files[0];

    if (!file) {
        const textInput = document.getElementById('textInput');
        console.log(textInput);
        if (textInput.value !== '') {
            const blob = new Blob([textInput.value], { type: 'text/plain' });
            file = new File([blob], 'text.txt', { type: 'text/plain' });
        }
    }

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (file) {
        crypter(username, password, file).then(processedContent => {
            const url = URL.createObjectURL(processedContent);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.name+'.txt';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }).catch(error => {
            console.error("Error processing file:", error);
            alert("Failed to process file.");
        });
    } else {
        alert('Please select a file to process.');
    }
};