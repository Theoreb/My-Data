import { encrypt, decrypt, encodeCiphertext, decodeCiphertext, encodeBlobToBase64, decodeBase64ToBlob } from './encryption.js';
import { fetchData, fetchJsonData, downloadFile } from './requests.js';
import { showErrorPopup } from './errors.js';

const files = await fetchJsonData('files.json');
const accounts = await fetchJsonData('accounts.json');
const sidebar = document.getElementById('sidebar');
const content = document.getElementById('content');
let currentUser = {"username":"guest","password":"","level":0,"key":{}};

function hideCryptor() {
    const cryptor = document.getElementById('cryptor');
    if (cryptor) {
        content.removeChild(cryptor);
    }
}

function showCryptor() {
    hideCryptor();
    hideFileInfo();
    const iframe = document.createElement('iframe');
    iframe.src = 'cryptor.html';
    iframe.id = 'cryptor';
    content.appendChild(iframe);
}

function createFilesBar() {
    for (const file of files['files']) {
        createFileBar(file);
    }
}

function hideFileInfo() {
    const infoDiv = document.getElementById('fileInfo');
    if (infoDiv) {
        content.removeChild(infoDiv);
    }
}

function showFileInfo(file, canDownload) {
    hideFileInfo();
    hideCryptor();

    const infoDiv = document.createElement('div');
    infoDiv.id = 'fileInfo';
    content.appendChild(infoDiv);

    const fileInfoIcon = document.createElement('img');
    fileInfoIcon.src = file['icon'];
    infoDiv.appendChild(fileInfoIcon);

    const createParagraph = (className, text) => {
        const paragraph = document.createElement('p');
        paragraph.classList.add(className);
        paragraph.innerText = text;
        infoDiv.appendChild(paragraph);
    };

    createParagraph('fileInfoName', 'Name: ' + file['name']);
    createParagraph('fileInfoType', 'Type: ' + file['type']);
    createParagraph('fileInfoInfo', 'Info: ' + file['info']);
    createParagraph('fileInfoDetail', 'Detail: ' + file['detail']);

    if (!canDownload) {
        return;
    }

    const downloadButton = document.createElement('button');
    downloadButton.classList.add('downloadButton');
    downloadButton.innerText = 'Download';
    infoDiv.appendChild(downloadButton);

    downloadButton.addEventListener('click', async () => {
        const progressBar = document.createElement('progress');
        progressBar.max = 100;
        progressBar.value = 0;
        progressBar.classList.add('progressBar');
        infoDiv.appendChild(progressBar);

        const details = document.createElement('p');
        details.classList.add('details');
        infoDiv.appendChild(details);

        await decryptAndDownloadFile(file, progressBar, details);
    });
}

function createFileBar(file) {
    const fileBar = document.createElement('div');
    fileBar.classList.add('fileBar');
    fileBar.innerText = file['name'];

    const createFileBarInfo = (text) => {
        const fileBarInfo = document.createElement('p');
        fileBarInfo.classList.add('fileBarInfo');
        fileBarInfo.innerText = text;
        fileBar.appendChild(fileBarInfo);
    };

    createFileBarInfo(file['type']);

    if ('info' in file) {
        createFileBarInfo(file['info']);
    }

    const fileBarLevel = document.createElement('p');
    fileBarLevel.classList.add('fileBarLevel');
    fileBarLevel.innerText = 'Permission: ' + file['level'];
    fileBar.appendChild(fileBarLevel);
    sidebar.appendChild(fileBar);

    if (file['level'] > currentUser['level']) {
        fileBarLevel.style.backgroundColor = 'red';
    }

    fileBar.addEventListener('click', () => fileBarClick(file));
}

function showMyAccount() {
    const loginPage = document.getElementById('login-page');
    loginPage.style.display = 'none';

    const shell = document.createElement('div');
    shell.classList.add('shell-container');
    const shellText = document.createElement('p');
    shellText.classList.add('shell-text');
    shellText.innerText = `Hello, '${currentUser['username']}' ! Your keys: '${JSON.stringify(currentUser['key'])}'`;
    shell.appendChild(shellText);
    content.appendChild(shell);

    const menuButton = document.createElement('button');
    menuButton.id = 'menuButton';
    menuButton.innerText = 'Cryptor Menu ➤';
    shell.appendChild(menuButton);

    menuButton.addEventListener('click', () => {
        showCryptor();
    });
}

window.login = async (event) => {
    event.preventDefault();
    if (event.submitter.id !== 'guest-button') {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        for (const account of accounts['accounts']) {
            try {
                const cipherText = decodeCiphertext(account);
                const decryptedData = await decrypt(cipherText, username, password);
                const decryptedBlob = decodeBase64ToBlob(decryptedData, 'text/plain');
                const decodedData = await decryptedBlob.text();
                const accountData = JSON.parse(decodedData);

                if (accountData['password'] === password && accountData['username'] === username) {
                    currentUser = accountData;
                    console.log('Login successful!');
                    break;
                }
            } catch (error) {
                continue;
            }
        }

        if (currentUser['username'] === '') {
            console.log('Login failed');
            showErrorPopup('Invalid username or password');
            return;
        }
    }

    showMyAccount();
    createFilesBar();
}

function fileBarClick(file) {
    if (file['level'] > currentUser['level']) {
        showFileInfo(file, false);
    } else {
        showFileInfo(file, true);
    }
}

async function decryptAndDownloadFile(file, progressBar, details) {
    try {
        details.innerText = 'Fetching file...';

        const content = await fetchData(file['path'], progressBar, file['size']);
        let finalBlob;

        if (file['key']) {
            const key = currentUser['key']['level' + file['level']];
            if (!key) {
                showErrorPopup('Key not found');
                return;
            }

            details.innerText = 'Decrypting file...';

            const chunkSize = 466060; // Size of each chunk
            progressBar.value = 0; // Reset progress bar

            let decryptedChunks = [];
            let offset = 0;

            while (offset < content.size) {
                const chunk = content.slice(offset, offset + chunkSize);

                // Decrypt chunk
                const decryptedChunk = await decryptChunk(chunk, key);
                if (decryptedChunk) {
                    decryptedChunks.push(decryptedChunk);
                }

                offset += chunkSize;
                progressBar.value = (offset / content.size) * 100;
            }

            finalBlob = new Blob(decryptedChunks, { type: file['type'] });
        } else {
            finalBlob = content;
        }

        details.innerText = 'Download file...';
        downloadFile(file['name'], finalBlob);
    } catch (error) {
        console.error(error);
        showErrorPopup('Error when decrypting file data: ' + error);
    }
}



async function decryptChunk(chunk, key) {
    try {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = async function(event) {
                try {
                    const encryptedChunkData = await new Response(event.target.result).text();
                    const decryptedCiphertext = decodeCiphertext(encryptedChunkData);
                    const decryptedData = await decrypt(decryptedCiphertext, key[0], key[1]);
                    const decryptedBlob = decodeBase64ToBlob(decryptedData, 'text/plain');
                    resolve(decryptedBlob);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = function() {
                reject(new Error('Error reading chunk'));
            };
            try {
                reader.readAsArrayBuffer(chunk);
            } catch (error) {
                console.error('Error decrypting chunk: ', error);
                reject(error); 
            }
        });
    } catch (error) {
        console.error('Error decrypting chunk: ', error);
        return null; 
    }
}
