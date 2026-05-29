document.addEventListener('DOMContentLoaded', () => {
    // --- Authentication ---
    const urlParams = new URLSearchParams(window.location.search);
    const authToken = urlParams.get('token');
    
    console.log('Page loaded with URL:', window.location.href);
    console.log('Auth token from URL:', authToken ? authToken.substring(0, 8) + '...' : 'MISSING');
    
    // Helper function to make authenticated fetch requests
    const authenticatedFetch = (url, options = {}) => {
        const headers = options.headers || {};
        if (authToken) {
            headers.Authorization = `Bearer ${authToken}`;
            console.log(`Sending ${options.method || 'GET'} to ${url} WITH token`);
        } else {
            console.warn(`Sending ${options.method || 'GET'} to ${url} WITHOUT token!`);
        }
        return fetch(url, { ...options, headers });
    };

    // --- Error/Notification System ---
    const notificationContainer = document.getElementById('error-notifications');

    function showNotification(type, title, message, duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `error-notification ${type}`;
        
        const icons = {
            error: '⚠️',
            warning: '⚠️',
            info: 'ℹ️',
            success: '✓'
        };

        notification.innerHTML = `
            <div class="error-notification-icon">${icons[type] || '✓'}</div>
            <div class="error-notification-content">
                ${title ? `<div class="error-notification-title">${escapeHtml(title)}</div>` : ''}
                <div class="error-notification-message">${escapeHtml(message)}</div>
            </div>
            <button class="error-notification-close" aria-label="Close notification">✕</button>
        `;

        const closeBtn = notification.querySelector('.error-notification-close');
        closeBtn.addEventListener('click', () => removeNotification(notification));

        notificationContainer.appendChild(notification);

        if (duration > 0) {
            setTimeout(() => removeNotification(notification), duration);
        }

        return notification;
    }

    function removeNotification(notification) {
        notification.classList.add('removing');
        setTimeout(() => notification.remove(), 300);
    }

    function showError(title, message, duration = 6000) {
        console.error(`[${title}] ${message}`);
        return showNotification('error', title, message, duration);
    }

    function showWarning(title, message, duration = 5000) {
        console.warn(`[${title}] ${message}`);
        return showNotification('warning', title, message, duration);
    }

    function showSuccess(message, duration = 3000) {
        console.log(`[Success] ${message}`);
        return showNotification('success', null, message, duration);
    }

    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // --- Loading Indicators ---
    function showLoading(message = 'Loading video...') {
        loadingText.textContent = message;
        loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }

    function showTranscodingStatus(visible = true) {
        // Removed
    }

    function setTranscodingMessage(message = 'Transcoding...') {
        // Removed
    }


    // --- Elements ---
    const videoList = document.getElementById('video-list');
    const videoPlayer = document.getElementById('video-player');
    const seekOverlay = document.getElementById('seek-overlay');
    
    // Modal & Config
    const folderModal = document.getElementById('folder-modal');
    const settingsModal = document.getElementById('settings-modal');
    const folderBtn = document.getElementById("folder-btn");
    const appSettingsBtn = document.getElementById("app-settings-btn");
    const folderClose = document.getElementById("folder-close");
    const settingsClose = document.getElementById("settings-close");
    const browseBtn = document.getElementById("browse-btn");
    const dirInput = document.getElementById("video-dir-input");
    const folderSaveBtn = document.getElementById("folder-save-btn");
    const transcodeToggle = document.getElementById("transcode-toggle");
    
    // Player Controls
    const playPauseBtn = document.getElementById('play-pause');
    const prevVideoBtn = document.getElementById('prev-video');
    const nextVideoBtn = document.getElementById('next-video');
    const progressBarContainer = document.getElementById('progress-bar-container');
    const progressBar = document.getElementById('progress-bar');
    const timeTooltip = document.getElementById('time-tooltip');
    const timeDisplay = document.getElementById('time-display');
    const volumeSlider = document.getElementById('volume-slider');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const playerContainer = document.getElementById('player-container');
    const controls = document.getElementById('video-controls');
    const muteBtn = document.getElementById('mute-btn');

    // New Settings Menu Elements
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const ccBtn = document.getElementById('cc-btn');
    
    // Loading Indicators
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    
    // --- State ---
    let currentVideoPath = null;
    let currentVideoIndex = -1;
    let allVideos = []; // Array of all available videos
    let currentVideoElement = null; // Reference to the current video list item
    let isTranscoding = false;
    let currentVideoCodec = null; 
    let currentAudioTrack = null; // null means default track
    let currentSubtitleTrack = -1; // -1 for off
    let currentBurnSubtitleTrack = null; // absolute stream index for burned-in subtitles
    let availableSubtitles = [];
    const supportedSubtitleCodecs = new Set(['subrip', 'srt', 'ass', 'ssa', 'webvtt', 'mov_text', 'text']);

    function isSubtitleWebVttConvertible(track) {
        if (!track || !track.codec) return true;
        return supportedSubtitleCodecs.has(String(track.codec).toLowerCase());
    }

    function buildStreamUrl(encodedPath, startTime) {
        let url = `/stream/${encodedPath}?startTime=${startTime}&vCodec=${currentVideoCodec || ''}`;
        if (currentAudioTrack !== null) url += `&audioIndex=${currentAudioTrack}`;
        if (currentBurnSubtitleTrack !== null) url += `&subtitleIndex=${currentBurnSubtitleTrack}`;
        return url;
    }
    
    let streamOffset = 0;
    let totalDuration = 0;
    let controlsTimeout;
    let isDragging = false;
    let videoLoadId = 0; // Unique ID for each video load to prevent race conditions
    
    // Folder Polling
    let lastKnownVideos = [];
    let pollingInterval = null;
    const POLLING_INTERVAL_MS = 3000; // Poll every 3 seconds

    // Load saved preference
    const savedTranscode = localStorage.getItem('transcodePref');
    if (savedTranscode === 'true') {
        transcodeToggle.checked = true;
        isTranscoding = true;
    }

    // --- Core Video Logic ---

    function loadVideos() {
        authenticatedFetch('/api/videos')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: Failed to fetch video list`);
                }
                return response.json();
            })
            .then(videos => {
                videoList.innerHTML = '';
                if (!videos || videos.length === 0) {
                    const emptyMsg = document.createElement('div');
                    emptyMsg.style.cssText = 'padding: 20px; color: #888; text-align: center; font-size: 0.9em;';
                    emptyMsg.textContent = 'No videos found in the selected folder.';
                    videoList.appendChild(emptyMsg);
                    showWarning('No Videos', 'The selected folder appears to be empty or inaccessible.');
                    lastKnownVideos = [];
                    allVideos = [];
                    return;
                }
                
                // Update last known videos and store all videos for navigation
                lastKnownVideos = [...videos];
                allVideos = [...videos];
                
                videos.forEach(video => {
                    const div = document.createElement('div');
                    div.className = 'video-item';
                    div.dataset.path = video; 
                    div.title = video;

                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = video;
                    div.appendChild(nameSpan);
                    
                    div.onclick = () => playVideo(video, div);
                    videoList.appendChild(div);
                    
                    // Load progress for this video
                    loadVideoProgress(video, div);
                });
                
                // Last played
                authenticatedFetch('/api/last_played')
                    .then(r => r.ok ? r.json() : Promise.reject('Failed to load last played'))
                    .then(data => {
                        if(data.last_played) highlightLastPlayed(data.last_played);
                    })
                    .catch(e => console.log('Could not restore last played:', e));
            })
            .catch(error => {
                videoList.innerHTML = '';
                const errorMsg = document.createElement('div');
                errorMsg.style.cssText = 'padding: 20px; color: #f44; text-align: center; font-size: 0.9em;';
                errorMsg.textContent = 'Failed to load videos. Check the folder path in settings.';
                videoList.appendChild(errorMsg);
                showError('Failed to Load Videos', 'Cannot access the video folder. ' + error.message);
                console.error('Error loading videos:', error);
            });
    }

    function removeSubtitleTracks() {
        // Iterate through textTracks property first to disable active tracks
        if (videoPlayer.textTracks) {
            for (let i = 0; i < videoPlayer.textTracks.length; i++) {
                 // Set mode to disabled to hide any active cues immediately
                 try {
                     videoPlayer.textTracks[i].mode = 'disabled';
                 } catch (e) { console.warn("Failed to disable track", e); }
            }
        }
        
        // Then remove the track elements from DOM
        const tracks = videoPlayer.getElementsByTagName('track');
        while (tracks.length > 0) {
            tracks[0].remove();
        }
        
        // Double check
        Array.from(videoPlayer.querySelectorAll('track')).forEach(t => t.remove());
    }

    // --- Folder Polling System ---
    function startFolderPolling() {
        if (pollingInterval) return; // Already polling
        
        pollingInterval = setInterval(() => {
            checkForVideoChanges();
        }, POLLING_INTERVAL_MS);
        
        console.log(`Folder polling started (interval: ${POLLING_INTERVAL_MS}ms)`);
    }

    function stopFolderPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
            console.log('Folder polling stopped');
        }
    }

    function checkForVideoChanges() {
        authenticatedFetch('/api/videos')
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch videos');
                return response.json();
            })
            .then(videos => {
                if (!videos) videos = [];
                
                // Compare with last known state
                const videosChanged = JSON.stringify(videos.sort()) !== JSON.stringify(lastKnownVideos.sort());
                
                if (videosChanged) {
                    console.log('Video list changed detected');
                    
                    // Find added and removed videos
                    const added = videos.filter(v => !lastKnownVideos.includes(v));
                    const removed = lastKnownVideos.filter(v => !videos.includes(v));
                    
                    // Update the list
                    lastKnownVideos = [...videos];
                    loadVideos();
                    
                    // Show notification
                    if (added.length > 0 || removed.length > 0) {
                        let message = '';
                        if (added.length > 0) {
                            message += `Added: ${added.length} video${added.length > 1 ? 's' : ''}`;
                        }
                        if (removed.length > 0) {
                            if (message) message += ' | ';
                            message += `Removed: ${removed.length} video${removed.length > 1 ? 's' : ''}`;
                        }
                        showSuccess(`Folder updated - ${message}`);
                    }
                }
            })
            .catch(error => {
                console.error('Error checking for video changes:', error);
                // Continue polling even on error
            });
    }

    // --- Watch History Visualization ---
    function loadVideoProgress(videoPath, videoElement) {
        const encodedPath = encodeURIComponent(videoPath);
        
        authenticatedFetch(`/api/progress/${encodedPath}`)
            .then(res => res.ok ? res.json() : Promise.resolve({ timestamp: 0 }))
            .then(data => {
                if (!data || !data.timestamp) return;

                const watched = data.timestamp;
                const timeWatched = formatTime(watched);
                
                // Update tooltip with watch progress (without probing metadata for duration)
                videoElement.title = `${videoPath}\nWatched up to: ${timeWatched}`;
            })
            .catch(e => console.log('Could not load progress for video:', e));
    }

    function playVideo(relPath, element, forceTranscode = false) {
        // Increment load ID to invalidate pending async operations from previous video
        videoLoadId++;
        const thisLoadId = videoLoadId;
        
        // Track the current video index and element
        currentVideoIndex = allVideos.indexOf(relPath);
        currentVideoElement = element;
        
        // Save progress of previous
        if (currentVideoPath && !videoPlayer.paused) {
            let t = videoPlayer.currentTime;
            if (isTranscoding) t += streamOffset;
            saveProgress(currentVideoPath, t);
        }
        
        // Reset State
        isTranscoding = forceTranscode || transcodeToggle.checked;
        
        // Auto-transcode check for unsupported containers
        let autoEnforced = false;
        if (!isTranscoding) {
            const ext = relPath.substring(relPath.lastIndexOf('.')).toLowerCase();
            if (['.mkv', '.avi', '.wmv', '.flv', '.mov', '.ts', '.m3u8'].includes(ext)) {
                 console.log("Auto-enabled compatibility mode (container)");
                 isTranscoding = true;
                 transcodeToggle.checked = true; 
                 autoEnforced = true;
            }
        }

        // Disable toggle if enforced
        if (autoEnforced) {
            transcodeToggle.disabled = true;
            transcodeToggle.parentElement.title = "This format requires Compatibility Mode";
            document.querySelector('.compatibility-box').classList.add('disabled');
            document.querySelector('.compat-desc').textContent = "Required for this file format.";
        } else {
            transcodeToggle.disabled = false;
            transcodeToggle.parentElement.title = "";
            document.querySelector('.compatibility-box').classList.remove('disabled');
            document.querySelector('.compat-desc').textContent = "Enable if video fails to play or has no audio (MKV/AVI).";
            
            // Re-apply correct state if we revisited a supported file
            transcodeToggle.checked = isTranscoding;
        }

        streamOffset = 0;
        totalDuration = 0;
        currentAudioTrack = null; 
        currentSubtitleTrack = -1;
        currentBurnSubtitleTrack = null;
        
        // UI Reset
        videoPlayer.playbackRate = 1.0;
        updateSpeedSelection(1.0);
        highlightLastPlayed(relPath); // Update UI highlight
        
        currentVideoPath = relPath;
        document.getElementById('current-video-title').textContent = relPath.split(/[\\/]/).pop();
        
        const encodedPath = encodeURIComponent(relPath);
        
        // Cleanup old subtitles properly first
        removeSubtitleTracks();
        
        // FULL CLEANUP
        videoPlayer.innerHTML = '';
        
        // Show loading indicator
        showLoading('Loading video metadata...');
        
        // Show transcoding status if active
        if (isTranscoding) {
            showTranscodingStatus(true);
            setTranscodingMessage('Preparing video stream...');
        } else {
            showTranscodingStatus(false);
        }

        // Fetch Metadata
        authenticatedFetch(`/api/metadata/${encodedPath}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}: Cannot read video metadata`);
                return res.json();
            })
            .then(meta => {
                // Check if this load is still current (prevents race condition)
                if (thisLoadId !== videoLoadId) return;
                if (currentVideoPath !== relPath) return; // Prevent async metadata loading of old videos

                if (!meta || typeof meta.duration === 'undefined') {
                    throw new Error('Invalid or corrupted video file');
                }

                totalDuration = meta.duration || 0;
                currentVideoCodec = meta.videoCodec;

                // Auto-enable compatibility mode for files with non-browser-playable audio
                // (e.g. MP4 with AC3/DTS/EAC3/FLAC audio codecs)
                if (!isTranscoding && !autoEnforced && meta.audioTracks && meta.audioTracks.length > 0) {
                    const browserAudioCodecs = ['aac', 'mp3', 'opus', 'vorbis', 'flac'];
                    const firstAudio = meta.audioTracks[0];
                    if (firstAudio.codec && !browserAudioCodecs.includes(firstAudio.codec.toLowerCase())) {
                        console.log(`Auto-enabled compatibility mode (audio codec: ${firstAudio.codec})`);
                        isTranscoding = true;
                        transcodeToggle.checked = true;
                        autoEnforced = true;
                        transcodeToggle.disabled = true;
                        transcodeToggle.parentElement.title = "This file's audio requires Compatibility Mode";
                        document.querySelector('.compatibility-box').classList.add('disabled');
                        document.querySelector('.compat-desc').textContent = `Audio codec (${firstAudio.codec}) requires transcoding.`;
                    }
                }
                
                setupAudioMenu(meta.audioTracks);
                setupSubtitleMenu(meta.subtitleTracks, encodedPath);

                // Load Progress
                authenticatedFetch(`/api/progress/${encodedPath}`)
                    .then(res => res.ok ? res.json() : Promise.resolve({ timestamp: 0 }))
                    .then(data => {
                        // Check if this load is still current
                        if (thisLoadId !== videoLoadId) return;
                        if (currentVideoPath !== relPath) return;

                        let savedTime = data.timestamp || 0;
                        
                        // Error fallback - comprehensive error handling
                        const errorHandler = (errorEvent) => {
                             hideLoading();
                             if (!isTranscoding) {
                                  const errorCode = videoPlayer.error?.code;
                                  const errorMessages = {
                                      1: 'Video file not found or access denied',
                                      2: 'Network error - cannot download video',
                                      3: 'Playback was aborted',
                                      4: 'Video format not supported by your browser'
                                  };
                                  const msg = errorMessages[errorCode] || 'Unknown playback error';
                                  showWarning('Playback Failed', `${msg}. Trying Compatibility Mode...`, 8000);
                                  console.warn("Playback failed, forcing transcode...", msg);
                                  videoPlayer.removeEventListener('error', errorHandler);
                                  transcodeToggle.checked = true; 
                                  playVideo(relPath, element, true);
                             } else {
                                  showError('Cannot Play Video', 'Video playback failed even in Compatibility Mode. File may be corrupted or unsupported.');
                                  videoPlayer.removeEventListener('error', errorHandler);
                             }
                        };
                        videoPlayer.addEventListener('error', errorHandler, { once: true });

                        if (isTranscoding) {
                            streamOffset = savedTime;
                            videoPlayer.src = buildStreamUrl(encodedPath, savedTime);
                        } else {
                            videoPlayer.src = `/video/${encodedPath}`;
                            videoPlayer.currentTime = savedTime;
                        }
                        
                        // Re-enable subtitle if selected (setupSubtitleMenu runs before this)
                        if (currentSubtitleTrack !== -1) {
                            enableSubtitle(currentSubtitleTrack, undefined, encodedPath);
                        }

                        videoPlayer.play().catch(e => {
                            hideLoading();
                            if (e.name === 'NotAllowedError') {
                                console.log('Autoplay blocked by browser policy');
                            } else {
                                console.error('Playback error:', e);
                                showError('Playback Error', 'Failed to start video playback. ' + e.message, 5000);
                            }
                        });
                    });
            })
            .catch(error => {
                if (thisLoadId !== videoLoadId) return;
                hideLoading();
                showTranscodingStatus(false);
                console.error('Error loading video:', error);
                showError('Cannot Load Video', `${error.message}. Make sure the file exists and is readable.`);
                document.getElementById('current-video-title').textContent = 'Error loading video';
            });
    }

    function highlightLastPlayed(path) {
        document.querySelectorAll('.last-played-indicator').forEach(el => el.remove());
        document.querySelectorAll('.video-item').forEach(el => el.classList.remove('active'));
        
        const items = Array.from(document.querySelectorAll('.video-item'));
        const item = items.find(el => el.dataset.path === path);
        
        if (item) {
            item.classList.add('active');
            const indicator = document.createElement('span');
            indicator.className = 'last-played-indicator';
            indicator.textContent = ' 👁️ Last Played';
            item.appendChild(indicator);
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // --- Settings Menu System ---

    settingsBtn.onclick = (e) => {
        e.stopPropagation();
        // Toggle display
        if (settingsMenu.style.display === 'block') {
            settingsMenu.style.display = 'none';
        } else {
            settingsMenu.style.display = 'block';
            showPanel('settings-main');
        }
    };

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) {
            settingsMenu.style.display = 'none';
        }
    });

    window.showPanel = function(panelId) {
        document.querySelectorAll('.settings-panel').forEach(p => {
            p.classList.add('hidden');
            p.style.display = 'none';
        });
        const target = document.getElementById(panelId);
        if(target) {
            target.classList.remove('hidden');
            target.style.display = 'block';
        }
    };

    // Main Menu Nav
    document.getElementById('row-speed').onclick = (e) => { e.stopPropagation(); showPanel('panel-speed'); };
    document.getElementById('row-audio').onclick = (e) => { e.stopPropagation(); showPanel('panel-audio'); };
    document.getElementById('row-subs').onclick = (e) => { e.stopPropagation(); showPanel('panel-subs'); };

    // Back Buttons
    document.querySelectorAll('.menu-header').forEach(h => {
        h.onclick = (e) => { e.stopPropagation(); showPanel('settings-main'); };
    });

    // Speed Logic
    document.querySelectorAll('#panel-speed .option').forEach(opt => {
        opt.onclick = (e) => {
            e.stopPropagation();
            const speed = parseFloat(opt.dataset.val);
            videoPlayer.playbackRate = speed;
            updateSpeedSelection(speed);
            showPanel('settings-main');
        };
    });

    function updateSpeedSelection(speed) {
        document.getElementById('speed-value').textContent = speed === 1 ? 'Normal' : speed + 'x';
        document.querySelectorAll('#panel-speed .option').forEach(o => {
            o.classList.remove('selected');
            if (parseFloat(o.dataset.val) === speed) o.classList.add('selected');
        });
    }

    // Audio Logic
    function setupAudioMenu(tracks) {
        const row = document.getElementById('row-audio');
        const list = document.getElementById('audio-list');
        list.innerHTML = '';
        
        if (!tracks || tracks.length <= 1) {
            row.style.display = 'none';
            return;
        }
        row.style.display = 'flex';

        // Auto-select based on preference if not already set
        if (currentAudioTrack === null) {
            const pref = localStorage.getItem('audioLangPref');
            if (pref) {
                const match = tracks.find(t => t.language === pref);
                if (match) {
                    currentAudioTrack = match.index;
                    const langDisp = match.language === 'und' ? `Track ${tracks.indexOf(match)+1}` : match.language.toUpperCase();
                    document.getElementById('audio-value').textContent = langDisp;
                }
            }
        }

        tracks.forEach((track, i) => {
            const div = document.createElement('div');
            div.className = 'option';
            const lang = track.language === 'und' ? `Track ${i+1}` : track.language.toUpperCase();
            div.textContent = `${lang} ${track.title ? '- ' + track.title : ''}`;
            
            // Check against track.index for correct selection highlighting
            if (track.index === currentAudioTrack) div.classList.add('selected');
            
            div.onclick = (e) => {
                e.stopPropagation();
                if (currentAudioTrack === track.index) return;
                
                // Save Preference
                localStorage.setItem('audioLangPref', track.language);

                currentAudioTrack = track.index;
                document.getElementById('audio-value').textContent = lang;
                
                // Reload for audio change
                let t = videoPlayer.currentTime;
                if (isTranscoding) t += streamOffset;
                
                if (!isTranscoding) {
                    isTranscoding = true; 
                    transcodeToggle.checked = true;
                }
                
                streamOffset = t;
                const encodedPath = encodeURIComponent(currentVideoPath);
                currentBurnSubtitleTrack = null;
                // Fix: use track.index NOT loop index i
                videoPlayer.src = buildStreamUrl(encodedPath, t);
                
                if (currentSubtitleTrack !== -1) {
                    enableSubtitle(currentSubtitleTrack, undefined, encodedPath);
                }

                videoPlayer.play();
                showPanel('settings-main');
            };
            list.appendChild(div);
        });
    }

    // Subtitle Logic
    function setupSubtitleMenu(tracks, encodedPath) {
        const row = document.getElementById('row-subs');
        const list = document.getElementById('subs-list');
        availableSubtitles = tracks || [];
        list.innerHTML = '';
        
        if (!tracks || tracks.length === 0) {
            row.style.display = 'none';
            ccBtn.style.display = 'none'; 
            return;
        }
        row.style.display = 'flex';
        ccBtn.style.display = 'block';

        // Auto-select based on preference
        if (currentSubtitleTrack === -1) {
            const pref = localStorage.getItem('subLangPref');
            if (pref && pref !== 'off') {
                const match = tracks.find(t => t.language === pref);
                if (match) {
                     currentSubtitleTrack = match.index;
                     document.getElementById('subs-value').textContent = match.language.toUpperCase();
                }
            } else {
                document.getElementById('subs-value').textContent = 'Off';
            }
        }

        // Add Off Option
        const offDiv = document.createElement('div');
        offDiv.className = 'option';
        offDiv.textContent = 'Off';
        if (currentSubtitleTrack === -1) offDiv.classList.add('selected');
        offDiv.onclick = (e) => {
             e.stopPropagation();
             localStorage.setItem('subLangPref', 'off');
             disableSubtitles();
             showPanel('settings-main');
        };
        list.appendChild(offDiv);

        tracks.forEach((track, i) => {
            const div = document.createElement('div');
            div.className = 'option';
            const lang = track.language === 'und' ? `Sub ${i+1}` : track.language.toUpperCase();
            const unsupported = !isSubtitleWebVttConvertible(track);
            const codecLabel = track.codec ? ` (${track.codec})` : '';
            div.textContent = `${lang} ${track.title ? '- ' + track.title : ''}${codecLabel}${unsupported ? ' [burn-in]' : ''}`;
            if (unsupported) div.style.opacity = '0.55';
            
            if (track.index === currentSubtitleTrack) div.classList.add('selected');

            div.onclick = (e) => {
                e.stopPropagation();
                localStorage.setItem('subLangPref', track.language);
                enableSubtitle(track.index, i, encodedPath); // stored index vs array index
                showPanel('settings-main');
            };
            list.appendChild(div);
        });
    }

    function disableSubtitles() {
        currentSubtitleTrack = -1;
        currentBurnSubtitleTrack = null;
        removeSubtitleTracks();
        
        // UI Updates
        document.getElementById('subs-value').textContent = 'Off';
        
        const list = document.getElementById('subs-list');
        Array.from(list.children).forEach(c => c.classList.remove('selected'));
        if(list.children[0]) list.children[0].classList.add('selected');

        ccBtn.querySelector('.red-line').style.display = 'block';
        ccBtn.style.opacity = '0.7';
    }

    function enableSubtitle(streamIndex, arrayIndex, encodedPath) {
         currentSubtitleTrack = streamIndex;
         
         // Remove old tracks reliably
         removeSubtitleTracks(); 
         
         const idx = arrayIndex !== undefined ? arrayIndex : availableSubtitles.findIndex(t => t.index === streamIndex);
         // Validate that idx is within bounds
         if (idx < 0 || idx >= availableSubtitles.length) return;
         const trackInfo = availableSubtitles[idx];
         if (!trackInfo) return;

         // For non-text codecs (e.g., PGS/DVD), burn subtitles into compatibility stream.
         if (!isSubtitleWebVttConvertible(trackInfo)) {
             if (!isTranscoding) {
                 isTranscoding = true;
                 transcodeToggle.checked = true;
             }

             currentBurnSubtitleTrack = streamIndex;
             removeSubtitleTracks();

             const currentAbsoluteTime = isTranscoding ? (streamOffset + videoPlayer.currentTime) : (videoPlayer.currentTime || 0);
             streamOffset = currentAbsoluteTime;
             videoPlayer.src = buildStreamUrl(encodedPath, currentAbsoluteTime);
             videoPlayer.play().catch(e => console.log('Subtitle burn-in play suppressed', e));

             const langName = trackInfo.language === 'und' ? `Sub ${idx+1}` : trackInfo.language.toUpperCase();
             document.getElementById('subs-value').textContent = `${langName} (burned)`;
             const list = document.getElementById('subs-list');
             Array.from(list.children).forEach(c => c.classList.remove('selected'));
             if(list.children[idx + 1]) list.children[idx + 1].classList.add('selected');
             ccBtn.querySelector('.red-line').style.display = 'none';
             ccBtn.style.opacity = '1';
             return;
         }

         currentBurnSubtitleTrack = null;

         const trackEl = document.createElement('track');
         trackEl.kind = 'subtitles';
         trackEl.label = trackInfo.title || `Track ${streamIndex}`;
         trackEl.srclang = trackInfo.language;
         
         // Use a slight "fudge" factor (0.1s) to help browser sync if packets are slightly off
         let src = `/api/subtitles/${encodedPath}?streamIndex=${streamIndex}`;
         if (isTranscoding && streamOffset > 0) {
             src += `&startTime=${streamOffset}`;
         }
         trackEl.src = src;
         
         trackEl.default = true;
         
         // Event listener for load
         trackEl.onload = (e) => {
             console.log('Subtitle track loaded successfully');
             // Force showing immediately
             if(e.target.track) {
                 e.target.track.mode = 'showing';
             }
         };
         trackEl.addEventListener('error', (e) => {
             console.error('Subtitle track failed to load', e);
             showWarning('Subtitle Load Failed', `Could not load subtitle track: ${trackInfo.title || 'Unknown'}`, 4000);
         });

         videoPlayer.appendChild(trackEl);
         
         // Ensure track is visible - use multiple approaches for better compatibility
         const ensureSubtitleVisible = () => {
             if (videoPlayer.textTracks && videoPlayer.textTracks.length > 0) {
                 for (let i = 0; i < videoPlayer.textTracks.length; i++) {
                     if (videoPlayer.textTracks[i].label === trackEl.label) {
                         videoPlayer.textTracks[i].mode = 'showing';
                         break;
                     }
                 }
             }
         };
         
         // Try multiple approaches for better compatibility
         trackEl.addEventListener('load', ensureSubtitleVisible);
         setTimeout(ensureSubtitleVisible, 50);
         videoPlayer.addEventListener('loadedmetadata', ensureSubtitleVisible, { once: true });
         
         // UI Updates
         const langName = trackInfo.language === 'und' ? `Sub ${idx+1}` : trackInfo.language.toUpperCase();
         document.getElementById('subs-value').textContent = langName;

         const list = document.getElementById('subs-list');
        Array.from(list.children).forEach(c => c.classList.remove('selected'));
        if(list.children[idx + 1]) list.children[idx + 1].classList.add('selected');

        ccBtn.querySelector('.red-line').style.display = 'none'; 
        ccBtn.style.opacity = '1';
    }

    // Quick Toggle CC
    ccBtn.onclick = (e) => {
        e.stopPropagation();
        if (currentSubtitleTrack !== -1) {
            disableSubtitles();
        } else if (availableSubtitles.length > 0) {
            const encodedPath = encodeURIComponent(currentVideoPath);
            enableSubtitle(availableSubtitles[0].index, 0, encodedPath);
        }
    };


    // --- Player Controls (Play, Progress, Volume) ---

    // Toggle Play
    function togglePlay() {
        if (videoPlayer.paused || videoPlayer.ended) videoPlayer.play();
        else videoPlayer.pause();
    }
    
    playPauseBtn.addEventListener('click', togglePlay);
    
    // Next video button handler
    nextVideoBtn.addEventListener('click', () => {
        if (allVideos.length === 0 || currentVideoIndex < 0) return;
        const nextIndex = currentVideoIndex + 1;
        if (nextIndex < allVideos.length) {
            // Find the video item by path matching
            const items = videoList.querySelectorAll('.video-item');
            if (nextIndex < items.length) {
                playVideo(allVideos[nextIndex], items[nextIndex]);
            }
        }
        nextVideoBtn.blur(); // Remove focus
    });
    
    // Previous video button handler
    prevVideoBtn.addEventListener('click', () => {
        if (allVideos.length === 0 || currentVideoIndex < 0) return;
        const prevIndex = currentVideoIndex - 1;
        if (prevIndex >= 0) {
            // Find the video item by index
            const items = videoList.querySelectorAll('.video-item');
            if (prevIndex < items.length) {
                playVideo(allVideos[prevIndex], items[prevIndex]);
            }
        }
        prevVideoBtn.blur(); // Remove focus
    });
    
    // Auto-play next video when current video ends
    videoPlayer.addEventListener('ended', () => {
        if (allVideos.length === 0 || currentVideoIndex < 0) return;
        const nextIndex = currentVideoIndex + 1;
        if (nextIndex < allVideos.length) {
            // Find the video item by index
            const items = videoList.querySelectorAll('.video-item');
            if (nextIndex < items.length) {
                playVideo(allVideos[nextIndex], items[nextIndex]);
            }
        }
    });
    
    videoPlayer.addEventListener('click', (e) => {
        if (settingsMenu.contains(e.target) || e.target === settingsBtn) return;
        togglePlay();
    });

    videoPlayer.addEventListener('play', () => {
         playPauseBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="#fff"/></svg>';
         isDragging = false; // Reset drag state to ensure updates resume
         showControls();
         hideLoading();
    });
    
    videoPlayer.addEventListener('pause', () => {
         playPauseBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="#fff"/></svg>';
         showControls();
    });

    // Hide loading when video is ready to play
    videoPlayer.addEventListener('canplay', () => {
         hideLoading();
    });

    // Show loading when video is seeking
    videoPlayer.addEventListener('seeking', () => {
         if (isTranscoding) {
             showLoading('Seeking video...');
             setTranscodingMessage('Processing stream...');
         }
    });

    // Update transcoding status when playing
    videoPlayer.addEventListener('playing', () => {
         if (isTranscoding) {
             showTranscodingStatus(true);
             setTranscodingMessage('Streaming...');
         }
    });

    // Mute
    muteBtn.addEventListener('click', () => {
        videoPlayer.muted = !videoPlayer.muted;
        const iconPath = muteBtn.querySelector('path');
        if (videoPlayer.muted) {
            iconPath.setAttribute('d', 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z');
        } else {
            iconPath.setAttribute('d', 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z');
        }
    });

    let audioCtx;
    let gainNode;
    let mediaSource;

    function initAudio() {
        if (audioCtx) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            mediaSource = audioCtx.createMediaElementSource(videoPlayer);
            gainNode = audioCtx.createGain();
            mediaSource.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            let val = parseFloat(volumeSlider.value);
            gainNode.gain.value = val > 1 ? Math.pow(val, 3) : 1;
        } catch(e) {
            console.error("Audio Context init failed", e);
        }
    }

    // Initialize audio context on first user interaction to prevent audio cut-out when volume exceeds 100%
    const unlockAudio = () => {
        if (!audioCtx) initAudio();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);

    const volumeOsd = document.getElementById('volume-osd');
    let volumeOsdTimeout;

    function updateVolumeVisuals(val, showOsd = true) {
        let percentage = Math.round(val * 100);
        
        // Dynamically color the slider track to show the 100% threshold
        const pct = (val / 1.5) * 100;
        if (val <= 1.0) {
            volumeSlider.style.background = `linear-gradient(to right, #fff ${pct}%, rgba(255,255,255,0.3) ${pct}%)`;
        } else {
            // 1.0 (100%) out of 1.5 is 66.66%
            volumeSlider.style.background = `linear-gradient(to right, #fff 66.66%, #f00 66.66%, #f00 ${pct}%, rgba(255,255,255,0.3) ${pct}%)`;
        }
        
        if (!showOsd) return;

        // Briefly show the On-Screen Display text overlay (like VLC)
        if (volumeOsd) {
            volumeOsd.textContent = `Volume: ${percentage}%`;
            volumeOsd.classList.add('show');
            clearTimeout(volumeOsdTimeout);
            volumeOsdTimeout = setTimeout(() => {
                volumeOsd.classList.remove('show');
            }, 1000);
        }
    }
    
    volumeSlider.addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        if (val > 1 && !audioCtx) {
            initAudio();
        }
        
        if (audioCtx) {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            videoPlayer.volume = Math.min(1, val);
            // By default, Web Audio linear gain of 1.5 only adds ~+3.5dB (barely noticeable).
            // Cubing the value effectively maps 150% to roughly +10.5dB (sounds twice as loud), 
            // giving that classic "VLC volume boost" signature!
            gainNode.gain.value = val > 1 ? Math.pow(val, 3) : 1;
        } else {
            videoPlayer.volume = Math.min(1, val);
        }

        updateVolumeVisuals(val);
    });

    // Also allow scrolling to adjust volume when mouse is over the container
    volumeSlider.parentElement.addEventListener('wheel', (e) => {
        e.preventDefault(); // Prevent page scroll
        let currentVal = parseFloat(volumeSlider.value);
        let delta = e.deltaY < 0 ? 0.05 : -0.05; // 5% chunks up/down
        let newVal = Math.max(0, Math.min(1.5, currentVal + delta)); // Clamp to 0-1.5
        volumeSlider.value = newVal;
        // Trigger manual input event so audio updates and visuals paint
        volumeSlider.dispatchEvent(new Event('input'));
    });

    // Initialize track color state on load
    updateVolumeVisuals(parseFloat(volumeSlider.value), false);

    // Progress
    function updateProgress() {
        if (!isDragging && currentVideoPath) {
            let currentTime = videoPlayer.currentTime;
            let duration = videoPlayer.duration;
            
            if (isTranscoding) {
                 duration = totalDuration;
                 currentTime = streamOffset + videoPlayer.currentTime;
            }

            // Guard against NaN / Infinity / zero durations
            if (!duration || !isFinite(duration) || isNaN(duration)) duration = totalDuration || 1;
            if (isNaN(currentTime) || !isFinite(currentTime)) currentTime = streamOffset || 0;
            
            const percent = Math.min(100, Math.max(0, (currentTime / duration) * 100));
            progressBar.style.width = `${percent}%`;
            timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
        }
    }

    videoPlayer.addEventListener('timeupdate', updateProgress);
    
    // Fallback for sluggish timeupdate in compatibility mode
    setInterval(() => {
        if (isTranscoding && !videoPlayer.paused) {
            updateProgress();
        }
    }, 100);

    // Seek Drag
    progressBarContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        handleSeek(e, false);
    });

    progressBarContainer.addEventListener('mousemove', (e) => {
        const rect = progressBarContainer.getBoundingClientRect();
        let pos = (e.clientX - rect.left) / rect.width;
        pos = Math.max(0, Math.min(1, pos));
        
        const maxDuration = (isTranscoding && totalDuration) ? totalDuration : (videoPlayer.duration || 0);
        const hoverTime = pos * maxDuration;
        
        timeTooltip.textContent = formatTime(hoverTime);
        
        // Prevent tooltip from overflowing edges
        const ttWidth = timeTooltip.offsetWidth || 50; 
        const minX = ttWidth / 2;
        const maxX = rect.width - (ttWidth / 2);
        const clampedX = Math.max(minX, Math.min(maxX, pos * rect.width));
        
        timeTooltip.style.left = `${clampedX}px`;
    });

    document.addEventListener('mouseup', (e) => {
        if (isDragging) {
            handleSeek(e, true);
            isDragging = false;
        }
    });

    function captureFrame() {
        if (!seekOverlay) return;

        // Only capture a new frame if we have valid video data to show.
        // If we are already seeking (overlay visible) or video is not ready, keep the old frame.
        if (seekOverlay.style.display !== 'block' && videoPlayer.readyState >= 2) {
             seekOverlay.width = videoPlayer.videoWidth;
             seekOverlay.height = videoPlayer.videoHeight;
             const ctx = seekOverlay.getContext('2d');
             ctx.drawImage(videoPlayer, 0, 0, seekOverlay.width, seekOverlay.height);
             seekOverlay.style.display = 'block';
        }
    }

    function clearFrame() {
        if (seekOverlay) {
            seekOverlay.style.display = 'none';
        }
    }
    
    // Add event listener to clear overlay when new video starts playing
    videoPlayer.addEventListener('loadeddata', clearFrame);
    // Also clear on error just in case
    videoPlayer.addEventListener('error', clearFrame);

    function handleSeek(e, commit) {
        const rect = progressBarContainer.getBoundingClientRect();
        const maxDuration = (isTranscoding && totalDuration) ? totalDuration : (videoPlayer.duration || 0);
        let pos = (e.clientX - rect.left) / rect.width;
        pos = Math.max(0, Math.min(1, pos));
        
        const newTime = pos * maxDuration;
        
        progressBar.style.width = `${pos * 100}%`;
        // Optimistically update time display
        timeDisplay.textContent = `${formatTime(newTime)} / ${formatTime(maxDuration)}`;
        
        if (commit) {
            if (isTranscoding) {
                // Buffer seek
                streamOffset = newTime;
                
                // Keep the current frame visible
                captureFrame();
                
                // Clear existing tracks
                removeSubtitleTracks();

                const encodedPath = encodeURIComponent(currentVideoPath);
                videoPlayer.src = buildStreamUrl(encodedPath, newTime);
                
                if (currentSubtitleTrack !== -1) {
                     enableSubtitle(currentSubtitleTrack, undefined, encodedPath);
                }

                // Attempt to play immediately
                const p = videoPlayer.play();
                if (p) p.catch(e => console.log("Seek play suppressed", e));

            } else {
                videoPlayer.currentTime = newTime;
            }
        }
    }
    
    // Formatting
    function formatTime(seconds) {
        if(isNaN(seconds) || !isFinite(seconds) || seconds < 0) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const h = Math.floor(m / 60);
        
        if (h > 0) return `${h}:${(m%60).toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        return `${m}:${s.toString().padStart(2,'0')}`;
    }

    // Fullscreen
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) playerContainer.requestFullscreen();
        else document.exitFullscreen();
    });
    
    // Only toggle fullscreen on true video-surface double-clicks.
    playerContainer.addEventListener('dblclick', (e) => {
        const interactiveTarget = e.target.closest('button, input, label, .menu-row, .option, .menu-header, #video-controls, #settings-menu');
        if (interactiveTarget) return;
        if (e.target !== videoPlayer) return;
        fullscreenBtn.click();
    });

    // Prevent control/menu double-clicks from bubbling to the container handler.
    controls.addEventListener('dblclick', (e) => e.stopPropagation());
    settingsMenu.addEventListener('dblclick', (e) => e.stopPropagation());

    // Control Visibility
    function showControls() {
        controls.className = 'controls'; // Ensure visible class
        controls.style.opacity = '1';
        playerContainer.style.cursor = 'default';
        
        clearTimeout(controlsTimeout);
        controlsTimeout = setTimeout(() => {
            if (!videoPlayer.paused && !controls.matches(':hover') && !settingsMenu.contains(document.activeElement)) {
                controls.style.opacity = '0';
                playerContainer.style.cursor = 'none';
            }
        }, 3000);
    }
    
    playerContainer.addEventListener('mousemove', showControls);
    playerContainer.addEventListener('click', showControls);

    // Save Progress Interval
    setInterval(() => {
        if (!videoPlayer.paused && currentVideoPath) {
            let t = videoPlayer.currentTime;
            if (isTranscoding) t = streamOffset + videoPlayer.currentTime;
            saveProgress(undefined, t);
        }
    }, 5000);

    function saveProgress(path, time) {
        const p = path || currentVideoPath;
        const t = (time !== undefined) ? time : videoPlayer.currentTime;
        if (!p) return;
        authenticatedFetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_path: p, timestamp: t }),
        }).then(() => {
            // Update the progress bar in the video list
            const videoItem = document.querySelector(`[data-path="${p}"]`);
            if (videoItem) {
                loadVideoProgress(p, videoItem);
            }
        });
    }

    // Directory Browser
    folderBtn.onclick = () => { 
        folderModal.style.display = "block"; 
        authenticatedFetch('/api/config').then(r => r.json()).then(config => {
            if(config.video_directory) dirInput.value = config.video_directory;
        });
    };

    appSettingsBtn.onclick = () => {
        settingsModal.style.display = "block";
        authenticatedFetch('/api/config').then(r => r.json()).then(config => {
            document.getElementById('allow-external-toggle').checked = config.allow_external === true;
        });
        authenticatedFetch('/api/about').then(r => r.json()).then(about => {
            document.getElementById('app-version').innerText = about.version;
            document.getElementById('app-build-date').innerText = about.buildDate;
        });
    }

    browseBtn.onclick = () => {
        authenticatedFetch('/api/choose-directory', { method: 'POST' })
            .then(r => r.json())
            .then(data => {
                if (data.path) {
                    dirInput.value = data.path;
                }
            });
    };

    folderClose.onclick = () => { folderModal.style.display = "none"; };
    settingsClose.onclick = () => { settingsModal.style.display = "none"; };
    
    window.onclick = (event) => { 
        if (event.target == folderModal) folderModal.style.display = "none"; 
        if (event.target == settingsModal) settingsModal.style.display = "none"; 
    };
    
    window.switchModalTab = function(tabName) {
        document.querySelectorAll('.modal-tab-content').forEach(tab => {
            tab.style.display = 'none';
            tab.classList.remove('active');
            tab.classList.remove('hidden');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.innerText.toLowerCase() === tabName) {
                btn.classList.add('active');
            }
        });
        const target = document.getElementById('tab-' + tabName);
        if (target) {
            target.style.display = 'block';
            target.classList.add('active');
            target.classList.remove('hidden');
        }
    }

    if (folderSaveBtn) {
        folderSaveBtn.addEventListener('click', () => {
            const dirPath = dirInput.value.trim();
            if (!dirPath) {
                showWarning('Invalid Path', 'Please enter a valid folder path.');
                return;
            }
            authenticatedFetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ video_directory: dirPath })
            }).then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to save settings`);
                return res.json();
            }).then(() => {
                showSuccess('Folder Updated - Loading videos...');
                lastKnownVideos = []; // Reset polling state
                stopFolderPolling();
                loadVideos();
                startFolderPolling();
                folderModal.style.display = "none";
            }).catch(error => {
                showError('Failed to Save Folder', 'Could not change the video folder. ' + error.message);
                console.error('Folder save error:', error);
            });
        });
    }

    document.getElementById('allow-external-toggle').addEventListener('change', (e) => {
        authenticatedFetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                allow_external: e.target.checked
            })
        });
    });

    // Transcode Pref Toggle
    transcodeToggle.addEventListener('change', () => {
        isTranscoding = transcodeToggle.checked;
        localStorage.setItem('transcodePref', isTranscoding);
        if (currentVideoPath) {
            // Save pos and reload
            let t = videoPlayer.currentTime;
            if (!transcodeToggle.checked) t += streamOffset; // was transcoding
            saveProgress(currentVideoPath, t);
            
            const items = Array.from(document.querySelectorAll('.video-item'));
            const el = items.find(e => e.dataset.path === currentVideoPath);
            playVideo(currentVideoPath, el);
        }
    });

    // --- Keyboard Shortcuts ---
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in an input field
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

        const key = e.key.toLowerCase();

        if (key === ' ' || key === 'k') {
            e.preventDefault(); // Prevent scrolling
            togglePlay();
            showControls();
        } else if (key === 'f') {
            fullscreenBtn.click();
            showControls(); // Ensure controls are visible when entering/exiting
        } else if (key === 'm') {
            muteBtn.click();
            showControls();
        } else if (key === 'arrowright' || key === 'l') {
            e.preventDefault(); // Prevent scrolling
            seekRelative(5);
            showControls();
        } else if (key === 'arrowleft' || key === 'j') {
            e.preventDefault(); // Prevent scrolling
            seekRelative(-5);
            showControls();
        }
    });

    function seekRelative(seconds) {
        if (!currentVideoPath) return; // Only seek if a video is loaded

        let duration = isTranscoding ? totalDuration : videoPlayer.duration;
        let currentTime = isTranscoding ? (streamOffset + videoPlayer.currentTime) : videoPlayer.currentTime;

        if (!duration) duration = Infinity; // Safety

        let newTime = currentTime + seconds;
        newTime = Math.max(0, Math.min(duration, newTime));
        
        // Optimistic UI update
        progressBar.style.width = `${(newTime / (duration || 1)) * 100}%`;
        timeDisplay.textContent = `${formatTime(newTime)} / ${formatTime(duration)}`;

        if (isTranscoding) {
            // For transcoding, we update the stream offset and reload
            // This mirrors the handleSeek logic for consistency
            streamOffset = newTime;
            
            removeSubtitleTracks();
            
            // Keep last frame
            captureFrame();

            const encodedPath = encodeURIComponent(currentVideoPath);
            videoPlayer.src = buildStreamUrl(encodedPath, newTime);
            
            if (currentSubtitleTrack !== -1) {
                 enableSubtitle(currentSubtitleTrack, undefined, encodedPath);
            }
            videoPlayer.play().catch(e => console.log("Seek play suppressed", e));
        } else {
            videoPlayer.currentTime = newTime;
        }
    }

    loadVideos();
    startFolderPolling();
});
