import courseData from './videos.js';

let player;
let currentVideo = null;
let completedVideos = JSON.parse(localStorage.getItem('algo_completed_videos')) || [];
let lastWatchedId = localStorage.getItem('algo_last_watched') || courseData[0].videos[0].videoId;

// DOM Elements
const chaptersContainer = document.getElementById('chapters-container');
const searchInput = document.getElementById('video-search');
const videoTitle = document.getElementById('video-title');
const progressPercent = document.getElementById('progress-percent');
const progressBarFill = document.getElementById('progress-bar-fill');
const markCompleteBtn = document.getElementById('mark-complete-btn');
const prevVideoBtn = document.getElementById('prev-video-btn');
const nextVideoBtn = document.getElementById('next-video-btn');
const autoplayToggle = document.getElementById('autoplay-toggle');
const completedCountLabel = document.getElementById('completed-count');
const totalCountLabel = document.getElementById('total-count');
const completionChecklist = document.getElementById('completion-checklist');
const curriculumOverview = document.getElementById('curriculum-overview');

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
    
    // Handle YouTube API if already loaded
    if (window.YT && window.YT.Player) {
        onYouTubeIframeAPIReady();
    }
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
                // Scroll sidebar to active video if needed
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
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
            'onStateChange': (event) => {
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
