const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Only register context menus on Windows
function registerContextMenu() {
    if (process.platform !== 'win32') {
        return;
    }

    try {
        const appPath = app.getAppPath();
        const iconPath = path.join(appPath, 'icon.ico');
        
        // Get the executable path
        const executablePath = process.execPath;
        
        // Escape backslashes for registry
        const escapedExePath = executablePath.replace(/\\/g, '\\\\');
        const escapedIconPath = fs.existsSync(iconPath) ? iconPath.replace(/\\/g, '\\\\') : '';

        // Register context menu for all files
        const contextMenuPath = 'HKCU\\Software\\Classes\\*\\shell\\Local-Video-Player';
        registerContextMenuEntry(contextMenuPath, escapedExePath, escapedIconPath);

        // Register context menu for folders
        const folderContextMenuPath = 'HKCU\\Software\\Classes\\Directory\\shell\\Local-Video-Player';
        registerContextMenuEntry(folderContextMenuPath, escapedExePath, escapedIconPath);

        console.log('Context menu registered successfully');
    } catch (err) {
        console.error('Failed to register context menu:', err.message);
    }
}

function registerContextMenuEntry(basePath, executablePath, iconPath) {
    try {
        // Create the main registry key
        execSync(`reg add "${basePath}" /ve /d "Open with Local Video Player" /f`, { windowsHide: true });

        // Set the icon (if available)
        if (iconPath && iconPath !== '') {
            try {
                execSync(`reg add "${basePath}" /v Icon /d "${iconPath}" /f`, { windowsHide: true });
            } catch (e) {
                // Icon registration failed, continue without icon
            }
        }

        // Register the command - pass the file/folder path as an argument
        // %1 is the selected file/folder path
        const commandPath = `${basePath}\\command`;
        const command = `"${executablePath}" --open "%1"`;
        execSync(`reg add "${commandPath}" /ve /d "${command}" /f`, { windowsHide: true });
    } catch (err) {
        console.error(`Failed to register context menu entry at ${basePath}:`, err.message);
    }
}

function unregisterContextMenu() {
    if (process.platform !== 'win32') {
        return;
    }

    try {
        // Remove video file context menu
        execSync('reg delete "HKCU\\Software\\Classes\\*\\shell\\Local-Video-Player" /f 2>nul', { windowsHide: true, shell: 'cmd.exe' });
        // Remove folder context menu
        execSync('reg delete "HKCU\\Software\\Classes\\Directory\\shell\\Local-Video-Player" /f 2>nul', { windowsHide: true, shell: 'cmd.exe' });
        console.log('Context menu unregistered successfully');
    } catch (err) {
        // Menu might not exist, that's fine
        console.log('Context menu cleanup complete');
    }
}

module.exports = {
    registerContextMenu,
    unregisterContextMenu
};
