const { ipcRenderer } = require('electron');

// Expose IPC to the renderer process in a safe way
window.electronAPI = {
    onOpenPath: (callback) => ipcRenderer.on('open-path', (event, path) => callback(path)),
    removeOpenPathListener: () => ipcRenderer.removeAllListeners('open-path')
};
