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
const completedCountLabel = document.getElementById('completed-count');
const totalCountLabel = document.getElementById('total-count');
const completionChecklist = document.getElementById('completion-checklist');
const curriculumOverview = document.getElementById('curriculum-overview');

// Initialize
function init() {
    renderChapters(courseData);
    renderCompletionChecklist();
    renderCurriculumTab();
    updateProgress();
    setupTabs();
    
    // Find initial video
    let initialVideo = findVideoById(lastWatchedId) || courseData[0].videos[0];
    selectVideo(initialVideo);
    
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
}

function findVideoById(id) {
    for (const chapter of courseData) {
        const found = chapter.videos.find(v => v.videoId === id);
        if (found) return found;
    }
    return null;
}

// Render Sidebar Chapters
function renderChapters(data, expandAll = false) {
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
    
    videoTitle.textContent = video.title;
    
    if (player && player.loadVideoById) {
        player.loadVideoById(video.videoId);
    }
    
    // UI Updates in Sidebar
    document.querySelectorAll('.video-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-id') === video.videoId) {
            item.classList.add('active');
            item.closest('.chapter').classList.add('open');
        }
    });
    
    updateButtonState();
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
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#ffffff']
    });
}

// Update Progress
function updateProgress() {
    const allVideos = courseData.flatMap(c => c.videos);
    const total = allVideos.length;
    const completed = completedVideos.length;
    const percentage = Math.round((completed / total) * 100);
    
    progressPercent.textContent = `${percentage}%`;
    progressBarFill.style.width = `${percentage}%`;
    
    completedCountLabel.textContent = completed;
    totalCountLabel.textContent = total;
}

function updateButtonState() {
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
        const isDone = chapter.videos.every(v => completedVideos.includes(v.videoId));
        const item = document.createElement('div');
        item.className = `checklist-item ${isDone ? 'done' : ''}`;
        item.innerHTML = `
            <i class="${isDone ? 'fas fa-check-circle' : 'far fa-circle'}"></i>
            <div class="item-info">
                <h3>${chapter.name}</h3>
                <p>${chapter.videos.filter(v => completedVideos.includes(v.videoId)).length}/${chapter.videos.length} videos completed</p>
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
}

// Tabs Logic
function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            
            btn.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.remove('hidden');
        });
    });
}

// YouTube API
window.onYouTubeIframeAPIReady = function() {
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: currentVideo ? currentVideo.videoId : '',
        playerVars: { 'autoplay': 0, 'rel': 0, 'modestbranding': 1 },
        events: {
            'onStateChange': (event) => {
                if (event.data === YT.PlayerState.ENDED) {
                    if (currentVideo && !completedVideos.includes(currentVideo.videoId)) {
                        toggleCompletion(currentVideo.videoId);
                    }
                }
            }
        }
    });
};

init();
