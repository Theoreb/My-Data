// Utility function to convert string to ArrayBuffer
function str2ab(str) {
  return new TextEncoder().encode(str);
}

// Utility function to convert ArrayBuffer to string
function ab2str(buffer) {
  return new TextDecoder().decode(buffer);
}


// Generates a cryptographic key based on a password and derived salt
async function generateKey(password, salt) {
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    str2ab(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: str2ab(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Hashes the input to produce output for IV and salt
async function hashForIVAndSalt(input) {
  const data = str2ab(input);
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  const iv = hashArray.slice(0, 12);
  const salt = hashArray.slice(12, 28);
  return { iv: new Uint8Array(iv), salt: new Uint8Array(salt) };
}

// Encrypts plaintext using a password and second password for IV and salt
export async function encrypt(plaintext, password, secondPassword) {
  const { iv, salt } = await hashForIVAndSalt(secondPassword);
  const key = await generateKey(password, salt);
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    str2ab(plaintext)
  );

  return { ciphertext: new Uint8Array(encryptedContent) };
}

// Decrypts ciphertext using a password and second password for IV and salt
export async function decrypt(ciphertext, password, secondPassword) {
  const { iv, salt } = await hashForIVAndSalt(secondPassword);
  const key = await generateKey(password, salt);
  const decryptedContent = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    ciphertext
  );

  return ab2str(decryptedContent);
}

// Encodes ciphertext to base64
export function encodeCiphertext(ciphertext) {
  return window.btoa(String.fromCharCode.apply(null, ciphertext));
}

// Decodes ciphertext from base64
export function decodeCiphertext(encodedCiphertext) {
  const binaryStr = window.atob(encodedCiphertext);
  return Uint8Array.from(binaryStr, char => char.charCodeAt(0));
}

export async function encodeBlobToBase64(blob) {
  // Read the blob as an ArrayBuffer
  const arrayBuffer = await blob.arrayBuffer();
  // Convert the ArrayBuffer to a typed array (Uint8Array)
  const uint8Array = new Uint8Array(arrayBuffer);
  // Convert each byte in the Uint8Array to a binary string, then join them
  const binaryString = uint8Array.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
  // Encode the binary string to Base64
  return window.btoa(binaryString);
}

export function decodeBase64ToBlob(base64String, mimeType = 'application/octet-stream') {
  const binaryString = window.atob(base64String);
  const length = binaryString.length;
  const bytes = new Uint8Array(new ArrayBuffer(length));

  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

