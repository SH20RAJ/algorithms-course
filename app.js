import courseData from './videos.js';

let player;
let currentVideo = null;
let completedVideos = JSON.parse(localStorage.getItem('algo_completed_videos')) || [];
let lastWatchedId = localStorage.getItem('algo_last_watched') || courseData[0].videos[0].videoId;
let currentSpeed = parseFloat(localStorage.getItem('algo_playback_speed')) || 1;

// DOM Elements
const chaptersContainer = document.getElementById('chapters-container');
const searchInput = document.getElementById('video-search');
const videoTitle = document.getElementById('video-title');
const progressPercent = document.getElementById('progress-percent');
const progressBarFill = document.getElementById('progress-bar-fill');
const markCompleteBtn = document.getElementById('mark-complete-btn');
const prevVideoBtn = document.getElementById('prev-video-btn');
const nextVideoBtn = document.getElementById('next-video-btn');
const speedToggleBtn = document.getElementById('speed-toggle-btn');
const autoplayToggle = document.getElementById('autoplay-toggle');
const completedCountLabel = document.getElementById('completed-count');
const totalCountLabel = document.getElementById('total-count');
const completionChecklist = document.getElementById('completion-checklist');
const curriculumOverview = document.getElementById('curriculum-overview');
const shortcutsBtn = document.getElementById('shortcuts-btn');
const shortcutsModal = document.getElementById('shortcuts-modal');
const closeModal = document.getElementById('close-modal');

// Flattened video list for navigation
const flatVideos = courseData.flatMap(c => c.videos);

// Initialize
function init() {
    // Find initial video
    currentVideo = findVideoById(lastWatchedId) || courseData[0].videos[0];
    
    renderChapters(courseData);
    renderCompletionChecklist();
    renderCurriculumTab();
    updateProgress();
    setupTabs();
    
    selectVideo(currentVideo);
    updateSpeedUI();
    
    // Search listener
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = courseData.map(chapter => ({
            ...chapter,
            videos: chapter.videos.filter(v => 
                v.title.toLowerCase().includes(query)
            )
        })).filter(chapter => chapter.videos.length > 0);
        renderChapters(filtered, true);
    });

    // Mark complete listener
    markCompleteBtn.addEventListener('click', () => {
        toggleCompletion(currentVideo.videoId);
    });

    // Navigation listeners
    prevVideoBtn.addEventListener('click', () => navigateVideo(-1));
    nextVideoBtn.addEventListener('click', () => navigateVideo(1));
    
    // Speed toggle listener
    speedToggleBtn.addEventListener('click', toggleSpeed);
    
    // Modal listeners
    shortcutsBtn.addEventListener('click', () => shortcutsModal.classList.remove('hidden'));
    closeModal.addEventListener('click', () => shortcutsModal.classList.add('hidden'));
    window.addEventListener('click', (e) => {
        if (e.target === shortcutsModal) shortcutsModal.classList.add('hidden');
    });
    
    // Handle YouTube API if already loaded
    if (window.YT && window.YT.Player) {
        onYouTubeIframeAPIReady();
    }

    setupKeyboardShortcuts();
}

function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts if user is typing in search or any input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (!player || !player.getPlayerState) return;

        const key = e.key.toLowerCase();
        
        // Prevent default for used keys to avoid page scroll etc.
        const handledKeys = [' ', 'k', 'j', 'l', 'f', 'm', 'n', 'p', 'c', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', '>', '<'];
        if (handledKeys.includes(key) || (key >= '0' && key <= '9')) {
            if (key !== 'f') e.preventDefault(); // Don't prevent F to allow browser native fullscreen if needed, but we handle it
        }

        switch (key) {
            case ' ':
            case 'k':
                togglePlayPause();
                break;
            case 'j':
                seek(-10);
                break;
            case 'l':
                seek(10);
                break;
            case 'arrowleft':
                seek(-5);
                break;
            case 'arrowright':
                seek(5);
                break;
            case 'f':
                toggleFullscreen();
                break;
            case 'm':
                toggleMute();
                break;
            case 'n':
                navigateVideo(1);
                showOSD('Next Video');
                break;
            case 'p':
                navigateVideo(-1);
                showOSD('Previous Video');
                break;
            case 'c':
                toggleCompletion(currentVideo.videoId);
                showOSD(completedVideos.includes(currentVideo.videoId) ? 'Completed' : 'Marked Incomplete');
                break;
            case '>':
                changeSpeed(0.25);
                break;
            case '<':
                changeSpeed(-0.25);
                break;
            case 'arrowup':
                changeVolume(5);
                break;
            case 'arrowdown':
                changeVolume(-5);
                break;
        }

        if (key >= '0' && key <= '9') {
            const percentage = parseInt(key) * 10;
            const duration = player.getDuration();
            player.seekTo((duration * percentage) / 100, true);
            showOSD(`Seek to ${percentage}%`);
        }
    });
}

function togglePlayPause() {
    const state = player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
        player.pauseVideo();
        showOSD('Paused', 'fa-pause');
    } else {
        player.playVideo();
        showOSD('Playing', 'fa-play');
    }
}

function seek(seconds) {
    const currentTime = player.getCurrentTime();
    player.seekTo(currentTime + seconds, true);
    showOSD(`${seconds > 0 ? '+' : ''}${seconds}s`, seconds > 0 ? 'fa-forward' : 'fa-backward');
}

function toggleMute() {
    if (player.isMuted()) {
        player.unMute();
        showOSD('Unmuted', 'fa-volume-up');
    } else {
        player.mute();
        showOSD('Muted', 'fa-volume-mute');
    }
}

function changeVolume(delta) {
    const volume = player.getVolume();
    const newVolume = Math.min(100, Math.max(0, volume + delta));
    player.setVolume(newVolume);
    showOSD(`Volume ${newVolume}%`, newVolume > volume ? 'fa-volume-up' : 'fa-volume-down');
}

function changeSpeed(delta) {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = speeds.indexOf(currentSpeed);
    let nextIndex = currentIndex + (delta > 0 ? 1 : -1);
    
    if (nextIndex >= 0 && nextIndex < speeds.length) {
        currentSpeed = speeds[nextIndex];
        localStorage.setItem('algo_playback_speed', currentSpeed);
        applySpeed();
        updateSpeedUI();
        showOSD(`${currentSpeed}x Speed`);
    }
}

function toggleFullscreen() {
    const container = document.querySelector('.video-player-container');
    if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

function showOSD(text, iconClass = null) {
    let osd = document.getElementById('player-osd');
    if (!osd) {
        osd = document.createElement('div');
        osd.id = 'player-osd';
        document.querySelector('.video-aspect-ratio').appendChild(osd);
    }
    
    osd.innerHTML = iconClass ? `<i class="fas ${iconClass}"></i> <span>${text}</span>` : `<span>${text}</span>`;
    osd.classList.remove('show');
    void osd.offsetWidth; // Trigger reflow
    osd.classList.add('show');
    
    if (osd.timeout) clearTimeout(osd.timeout);
    osd.timeout = setTimeout(() => {
        osd.classList.remove('show');
    }, 800);
}

function findVideoById(id) {
    for (const chapter of courseData) {
        const found = chapter.videos.find(v => v.videoId === id);
        if (found) return found;
    }
    return null;
}

function navigateVideo(direction) {
    const currentIndex = flatVideos.findIndex(v => v.videoId === currentVideo.videoId);
    const nextIndex = currentIndex + direction;
    
    if (nextIndex >= 0 && nextIndex < flatVideos.length) {
        selectVideo(flatVideos[nextIndex]);
    }
}

// Speed Control
function toggleSpeed() {
    const speeds = [1, 1.25, 1.5, 1.75, 2];
    const currentIndex = speeds.indexOf(currentSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    currentSpeed = speeds[nextIndex];
    
    localStorage.setItem('algo_playback_speed', currentSpeed);
    applySpeed();
    updateSpeedUI();
}

function applySpeed() {
    if (player && player.setPlaybackRate) {
        player.setPlaybackRate(currentSpeed);
    }
}

function updateSpeedUI() {
    if (speedToggleBtn) {
        speedToggleBtn.textContent = `${currentSpeed}x`;
    }
}

// Render Sidebar Chapters
function renderChapters(data, expandAll = false) {
    if (!chaptersContainer) return;
    chaptersContainer.innerHTML = '';
    data.forEach((chapter) => {
        const div = document.createElement('div');
        div.className = `chapter ${expandAll ? 'open' : ''}`;
        
        div.innerHTML = `
            <div class="chapter-title">
                <span>${chapter.name}</span>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="chapter-videos">
                ${chapter.videos.map(video => {
                    const isCompleted = completedVideos.includes(video.videoId);
                    const isActive = currentVideo && video.videoId === currentVideo.videoId;
                    return `
                        <div class="video-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}" data-id="${video.videoId}">
                            <span class="check-icon">
                                <i class="${isCompleted ? 'fas fa-check-circle' : 'far fa-circle'}"></i>
                            </span>
                            <span class="v-title">${video.title}</span>
                            <span class="v-duration">${video.duration || ''}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        div.querySelector('.chapter-title').addEventListener('click', () => {
            div.classList.toggle('open');
        });
        
        div.querySelectorAll('.video-item').forEach(item => {
            const vidId = item.getAttribute('data-id');
            const video = findVideoById(vidId);
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                selectVideo(video);
            });
        });
        
        chaptersContainer.appendChild(div);
    });
}

// Select Video
function selectVideo(video) {
    currentVideo = video;
    localStorage.setItem('algo_last_watched', video.videoId);
    
    if (videoTitle) videoTitle.textContent = video.title;
    
    if (player && player.loadVideoById) {
        player.loadVideoById(video.videoId);
    }
    
    // UI Updates in Sidebar
    document.querySelectorAll('.video-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-id') === video.videoId) {
            item.classList.add('active');
            const chapter = item.closest('.chapter');
            if (chapter) {
                chapter.classList.add('open');
            }
            // Scroll sidebar to active video
            setTimeout(() => {
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    });
    
    updateButtonState();
    updateNavigationButtons();
}

function updateNavigationButtons() {
    const currentIndex = flatVideos.findIndex(v => v.videoId === currentVideo.videoId);
    prevVideoBtn.disabled = currentIndex === 0;
    nextVideoBtn.disabled = currentIndex === flatVideos.length - 1;
    
    prevVideoBtn.style.opacity = prevVideoBtn.disabled ? '0.5' : '1';
    nextVideoBtn.style.opacity = nextVideoBtn.disabled ? '0.5' : '1';
}

// Toggle Completion
function toggleCompletion(videoId) {
    if (completedVideos.includes(videoId)) {
        completedVideos = completedVideos.filter(id => id !== videoId);
    } else {
        completedVideos.push(videoId);
        checkChapterCompletion(videoId);
    }
    
    localStorage.setItem('algo_completed_videos', JSON.stringify(completedVideos));
    updateProgress();
    renderChapters(courseData);
    renderCompletionChecklist();
    updateButtonState();
}

// Check Chapter Completion for Confetti
function checkChapterCompletion(videoId) {
    for (const chapter of courseData) {
        if (chapter.videos.some(v => v.videoId === videoId)) {
            const allDone = chapter.videos.every(v => completedVideos.includes(v.videoId));
            if (allDone) {
                triggerConfetti();
            }
            break;
        }
    }
}

function triggerConfetti() {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10b981', '#34d399', '#ffffff']
        });
    }
}

// Update Progress
function updateProgress() {
    const allVideos = courseData.flatMap(c => c.videos);
    const total = allVideos.length;
    const completed = completedVideos.length;
    const percentage = Math.round((completed / total) * 100);
    
    if (progressPercent) progressPercent.textContent = `${percentage}%`;
    if (progressBarFill) progressBarFill.style.width = `${percentage}%`;
    if (completedCountLabel) completedCountLabel.textContent = completed;
    if (totalCountLabel) totalCountLabel.textContent = total;
}

function updateButtonState() {
    if (!markCompleteBtn) return;
    const isCompleted = currentVideo && completedVideos.includes(currentVideo.videoId);
    if (isCompleted) {
        markCompleteBtn.innerHTML = '<i class="fas fa-check-circle"></i> Completed';
        markCompleteBtn.className = 'btn btn-success';
    } else {
        markCompleteBtn.innerHTML = '<i class="far fa-check-circle"></i> Mark as Complete';
        markCompleteBtn.className = 'btn btn-primary';
    }
}

// Render Completion Tab Checklist
function renderCompletionChecklist() {
    if (!completionChecklist) return;
    completionChecklist.innerHTML = '';
    courseData.forEach(chapter => {
        const doneCount = chapter.videos.filter(v => completedVideos.includes(v.videoId)).length;
        const totalCount = chapter.videos.length;
        const isDone = doneCount === totalCount;
        
        const item = document.createElement('div');
        item.className = `checklist-item ${isDone ? 'done' : ''}`;
        item.innerHTML = `
            <i class="${isDone ? 'fas fa-check-circle' : 'far fa-circle'}"></i>
            <div class="item-info">
                <h3 style="font-size: 1rem; margin-bottom: 0.25rem;">${chapter.name}</h3>
                <p style="font-size: 0.8rem; color: var(--text-secondary);">${doneCount}/${totalCount} videos completed</p>
            </div>
        `;
        completionChecklist.appendChild(item);
    });
}

// Render Curriculum Tab
function renderCurriculumTab() {
    if (!curriculumOverview) return;
    curriculumOverview.innerHTML = courseData.map(chapter => `
        <div class="chapter-card">
            <h4>${chapter.name}</h4>
            <p>${chapter.videos.length} Lectures</p>
        </div>
    `).join('');
    
    // Add click listener to chapter cards to open them in sidebar
    curriculumOverview.querySelectorAll('.chapter-card').forEach((card, index) => {
        card.addEventListener('click', () => {
            const chapters = chaptersContainer.querySelectorAll('.chapter');
            if (chapters[index]) {
                chapters[index].classList.add('open');
                chapters[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// Tabs Logic
function setupTabs() {
    document.querySelectorAll('.tab-header .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-header .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-body .tab-content').forEach(c => c.classList.add('hidden'));
            
            btn.classList.add('active');
            const targetTab = document.getElementById(`${tabId}-tab`);
            if (targetTab) targetTab.classList.remove('hidden');
        });
    });
}

// YouTube API
window.onYouTubeIframeAPIReady = function() {
    if (player) return; // Already initialized
    
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: currentVideo ? currentVideo.videoId : (courseData[0].videos[0].videoId),
        playerVars: { 
            'autoplay': 0, 
            'rel': 0, 
            'modestbranding': 1,
            'origin': window.location.origin
        },
        events: {
            'onReady': () => {
                applySpeed();
            },
            'onStateChange': (event) => {
                if (event.data === YT.PlayerState.PLAYING) {
                    applySpeed();
                }

                if (event.data === YT.PlayerState.ENDED) {
                    if (currentVideo && !completedVideos.includes(currentVideo.videoId)) {
                        toggleCompletion(currentVideo.videoId);
                    }
                    
                    // Autoplay logic
                    if (autoplayToggle && autoplayToggle.checked) {
                        setTimeout(() => {
                            navigateVideo(1);
                        }, 1000); // 1 second delay before next video
                    }
                }
            }
        }
    });
};

init();
