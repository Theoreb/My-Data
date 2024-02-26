import { showErrorPopup } from './errors.js';

export async function fetchData(url, progressBar, fileSize) {
  const response = await fetch(url);
  if (!response.ok) {
      showErrorPopup('Error when fetching data: ' + response.statusText);
      return;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  let total = parseInt(fileSize, 10);

  progressBar.max = 100;

  while (true) {
      const { done, value } = await reader.read();
      if (done) {
          break;
      }
      chunks.push(value);
      loaded += value.length;
      progressBar.value = Math.round((loaded / total) * 100);
  }

  const arrayBuffer = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
      arrayBuffer.set(chunk, offset);
      offset += chunk.length;
      progressBar.value = Math.round((offset / loaded) * 100);
  }

  const data = new Blob([arrayBuffer], { type: response.headers.get('content-type') });

  return data;
}

export async function fetchJsonData(url) {
    const response = await fetch(url);
    if (!response.ok) {
        showErrorPopup('Error when fetching data: ' + response.statusText);
        return
    }
    const data = await response.json();
    return data;
}

export function downloadFile(name, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}