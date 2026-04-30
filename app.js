import playlistData from './videos.js';

let player;
let currentVideoId = '';
let completedVideos = JSON.parse(localStorage.getItem('algo_completed_videos')) || [];
let lastWatched = localStorage.getItem('algo_last_watched') || playlistData[0].videoId;

const videoList = document.getElementById('video-list');
const searchInput = document.getElementById('video-search');
const currentTitle = document.getElementById('current-video-title');
const currentDesc = document.getElementById('video-description');
const progressPercent = document.getElementById('progress-percent');
const progressBarFill = document.getElementById('progress-bar-fill');
const markCompleteBtn = document.getElementById('mark-complete-btn');

// Initialize the app
function init() {
    renderVideoList(playlistData);
    updateProgress();
    
    // Set initial video
    const initialVideo = playlistData.find(v => v.videoId === lastWatched) || playlistData[0];
    selectVideo(initialVideo);
    
    // Search listener
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = playlistData.filter(v => 
            v.title.toLowerCase().includes(query) || 
            (v.description && v.description.toLowerCase().includes(query))
        );
        renderVideoList(filtered);
    });

    // Mark complete listener
    markCompleteBtn.addEventListener('click', () => {
        toggleCompletion(currentVideoId);
    });
}

// Render Video List
function renderVideoList(videos) {
    videoList.innerHTML = '';
    videos.forEach((video, index) => {
        const isCompleted = completedVideos.includes(video.videoId);
        const isActive = video.videoId === currentVideoId;
        
        const li = document.createElement('li');
        li.className = `video-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`;
        li.innerHTML = `
            <div class="check-mark">
                <i class="${isCompleted ? 'fas fa-check-circle' : 'far fa-circle'}"></i>
            </div>
            <div class="video-info-small">
                <h4>${video.title}</h4>
                <div class="video-meta">
                    <span><i class="far fa-clock"></i> ${video.duration}</span>
                </div>
            </div>
        `;
        
        li.addEventListener('click', () => selectVideo(video));
        videoList.appendChild(li);
    });
}

// Select Video
function selectVideo(video) {
    currentVideoId = video.videoId;
    lastWatched = video.videoId;
    localStorage.setItem('algo_last_watched', lastWatched);
    
    currentTitle.textContent = video.title;
    currentDesc.textContent = video.description || 'No description available.';
    
    // Update player
    if (player && player.loadVideoById) {
        player.loadVideoById(video.videoId);
    }
    
    // Update active state in UI
    document.querySelectorAll('.video-item').forEach(item => {
        item.classList.remove('active');
        if (item.querySelector('h4').textContent === video.title) {
            item.classList.add('active');
        }
    });

    // Update mark complete button state
    updateButtonState();
}

// Toggle Completion
function toggleCompletion(videoId) {
    if (completedVideos.includes(videoId)) {
        completedVideos = completedVideos.filter(id => id !== videoId);
    } else {
        completedVideos.push(videoId);
    }
    
    localStorage.setItem('algo_completed_videos', JSON.stringify(completedVideos));
    updateProgress();
    renderVideoList(playlistData);
    updateButtonState();
}

// Update Progress UI
function updateProgress() {
    const total = playlistData.length;
    const completed = completedVideos.length;
    const percentage = Math.round((completed / total) * 100);
    
    progressPercent.textContent = `${percentage}%`;
    progressBarFill.style.width = `${percentage}%`;
}

// Update Button State
function updateButtonState() {
    const isCompleted = completedVideos.includes(currentVideoId);
    if (isCompleted) {
        markCompleteBtn.innerHTML = '<i class="fas fa-check-circle"></i> Completed';
        markCompleteBtn.classList.remove('btn-primary');
        markCompleteBtn.classList.add('btn-complete');
    } else {
        markCompleteBtn.innerHTML = '<i class="far fa-check-circle"></i> Mark as Complete';
        markCompleteBtn.classList.remove('btn-complete');
        markCompleteBtn.classList.add('btn-primary');
    }
}

// YouTube IFrame API Callback
window.onYouTubeIframeAPIReady = function() {
    const initialVideo = playlistData.find(v => v.videoId === lastWatched) || playlistData[0];
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: initialVideo.videoId,
        playerVars: {
            'playsinline': 1,
            'modestbranding': 1,
            'rel': 0
        },
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
};

function onPlayerStateChange(event) {
    // If video ends, mark as complete automatically?
    if (event.data === YT.PlayerState.ENDED) {
        if (!completedVideos.includes(currentVideoId)) {
            toggleCompletion(currentVideoId);
        }
    }
}

// Start the app
init();
