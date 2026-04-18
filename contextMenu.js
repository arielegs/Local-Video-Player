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
        
        // Get the executable path - in packaged app it's the actual executable
        let executablePath = process.execPath;
        
        // For development, use the app path with electron as fallback
        // For production, process.execPath is the actual app executable
        if (!app.isPackaged) {
            // In dev mode, we'll use the app's main.js and electron to run it
            executablePath = process.execPath;
        }
        
        // Escape backslashes for registry
        const escapedExePath = executablePath.replace(/\\/g, '\\\\');
        
        // Try to find icon - look for both .ico and .png
        let iconPath = '';
        const icoPath = path.join(appPath, 'icon.ico');
        const pngPath = path.join(appPath, 'icon.png');
        
        if (fs.existsSync(icoPath)) {
            iconPath = icoPath.replace(/\\/g, '\\\\');
        } else if (fs.existsSync(pngPath)) {
            iconPath = pngPath.replace(/\\/g, '\\\\');
        }

        // Register context menu for folders
        const folderContextMenuPath = 'HKCU\\Software\\Classes\\Directory\\shell\\Open-with-Local-Video-Player';
        registerFolderContextMenu(folderContextMenuPath, escapedExePath, iconPath);

        // Register context menu for video files
        const videoExtensions = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'ts', 'm3u8', 'mpv'];
        videoExtensions.forEach(ext => {
            registerFileContextMenu(`.${ext}`, escapedExePath, iconPath);
        });

        console.log('Context menu registered successfully');
    } catch (err) {
        console.error('Failed to register context menu:', err.message);
    }
}

function registerFolderContextMenu(basePath, executablePath, iconPath) {
    try {
        // Create the main registry key
        execSync(`reg add "${basePath}" /ve /d "Open with Local Video Player" /f`, { windowsHide: true });

        // Set the icon (if available)
        if (iconPath) {
            try {
                execSync(`reg add "${basePath}" /v Icon /d "${iconPath}" /f`, { windowsHide: true });
            } catch (e) {
                console.warn('Failed to set icon for folder context menu');
            }
        }

        // Register the command
        const commandPath = `${basePath}\\command`;
        const command = `"${executablePath}" --open "%1"`;
        execSync(`reg add "${commandPath}" /ve /d "${command}" /f`, { windowsHide: true });
    } catch (err) {
        console.error(`Failed to register folder context menu:`, err.message);
    }
}

function registerFileContextMenu(extension, executablePath, iconPath) {
    try {
        // Ensure the file extension exists in registry
        const extPath = `HKCU\\Software\\Classes\\${extension}`;
        try {
            execSync(`reg add "${extPath}" /ve /d "Video File" /f`, { windowsHide: true });
        } catch (e) {
            // Extension might already exist
        }

        // Create the context menu for this extension
        const contextMenuPath = `${extPath}\\shell\\Open-with-Local-Video-Player`;
        
        // Create the main registry key
        execSync(`reg add "${contextMenuPath}" /ve /d "Open with Local Video Player" /f`, { windowsHide: true });

        // Set the icon (if available)
        if (iconPath) {
            try {
                execSync(`reg add "${contextMenuPath}" /v Icon /d "${iconPath}" /f`, { windowsHide: true });
            } catch (e) {
                console.warn(`Failed to set icon for ${extension} context menu`);
            }
        }

        // Register the command
        const commandPath = `${contextMenuPath}\\command`;
        const command = `"${executablePath}" --open "%1"`;
        execSync(`reg add "${commandPath}" /ve /d "${command}" /f`, { windowsHide: true });
    } catch (err) {
        console.error(`Failed to register context menu for ${extension}:`, err.message);
    }
}

function unregisterContextMenu() {
    if (process.platform !== 'win32') {
        return;
    }

    try {
        // Remove folder context menu
        execSync('reg delete "HKCU\\Software\\Classes\\Directory\\shell\\Open-with-Local-Video-Player" /f 2>nul || exit /b 0', { 
            windowsHide: true, 
            shell: 'cmd.exe' 
        });
        
        // Remove file extension context menus
        const videoExtensions = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'ts', 'm3u8', 'mpv'];
        videoExtensions.forEach(ext => {
            try {
                execSync(`reg delete "HKCU\\Software\\Classes\\.${ext}\\shell\\Open-with-Local-Video-Player" /f 2>nul || exit /b 0`, { 
                    windowsHide: true, 
                    shell: 'cmd.exe' 
                });
            } catch (e) {
                // Ignore
            }
        });
        
        console.log('Context menu unregistered successfully');
    } catch (err) {
        console.log('Context menu cleanup complete');
    }
}

module.exports = {
    registerContextMenu,
    unregisterContextMenu
};
