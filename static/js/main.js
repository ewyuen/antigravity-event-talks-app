// Application State
const state = {
    releases: [],
    filteredReleases: [],
    activeFilter: 'all',
    searchQuery: '',
    currentTweet: {
        text: '',
        link: ''
    }
};

// DOM Elements
const elements = {
    syncStatus: document.getElementById('syncStatus'),
    statusText: document.getElementById('statusText'),
    searchInput: document.getElementById('searchInput'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    statTotal: document.getElementById('statTotal'),
    statFeatures: document.getElementById('statFeatures'),
    statChanges: document.getElementById('statChanges'),
    statDeprecations: document.getElementById('statDeprecations'),
    filterChips: document.getElementById('filterChips'),
    filteredCount: document.getElementById('filteredCount'),
    totalCount: document.getElementById('totalCount'),
    releasesGrid: document.getElementById('releasesGrid'),
    tweetModal: document.getElementById('tweetModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    tweetContent: document.getElementById('tweetContent'),
    charCountText: document.getElementById('charCountText'),
    progressFill: document.getElementById('progressFill'),
    copyTweetBtn: document.getElementById('copyTweetBtn'),
    postTweetBtn: document.getElementById('postTweetBtn'),
    toastContainer: document.getElementById('toastContainer')
};

// Constants for tweet parsing
const MAX_TWEET_CHARS = 280;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    fetchReleases(false);
});

// Theme Logic
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    showToast(`Switched to ${newTheme} theme`, 'success');
}

function updateThemeIcon(theme) {
    const sunIcon = `<svg class="theme-icon-sun" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    const moonIcon = `<svg class="theme-icon-moon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    
    elements.themeToggleBtn.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
}

// Event Listeners
function setupEventListeners() {
    // Theme Toggle
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Refresh Feed
    elements.refreshBtn.addEventListener('click', () => fetchReleases(true));
    
    // Search Filtering
    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase();
        applyFiltersAndRender();
    });
    
    // Filter Chips
    elements.filterChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        
        // Remove active class from all chips
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        // Add active to clicked chip
        chip.classList.add('active');
        
        state.activeFilter = chip.dataset.filter;
        applyFiltersAndRender();
    });
    
    // Tweet Modal Controls
    elements.closeModalBtn.addEventListener('click', closeTweetModal);
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) closeTweetModal();
    });
    
    elements.tweetContent.addEventListener('input', handleTweetInput);
    elements.copyTweetBtn.addEventListener('click', copyTweetText);
    elements.postTweetBtn.addEventListener('click', postTweetOnTwitter);
}

// Fetch Release Notes
async function fetchReleases(force = false) {
    // UI Loading State
    elements.refreshBtn.classList.add('spinning');
    elements.syncStatus.className = 'status-dot loading';
    elements.statusText.textContent = force ? 'Refreshing...' : 'Loading...';
    
    try {
        const response = await fetch(`/api/releases${force ? '?force=true' : ''}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'error') {
            throw new Error(data.message);
        }
        
        state.releases = data.data;
        
        // Update Status Display
        elements.syncStatus.className = 'status-dot';
        elements.refreshBtn.classList.remove('spinning');
        
        const timestampStr = new Date(data.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        elements.statusText.textContent = `Updated at ${timestampStr}`;
        
        if (data.status === 'warning') {
            showToast(data.message, 'warning');
        } else {
            showToast(force ? 'Release notes successfully refreshed!' : 'Release notes loaded.', 'success');
        }
        
        // Render
        calculateAndRenderStats();
        applyFiltersAndRender();
        
    } catch (error) {
        console.error('Error fetching release notes:', error);
        elements.refreshBtn.classList.remove('spinning');
        elements.syncStatus.className = 'status-dot';
        elements.syncStatus.style.backgroundColor = '#ef4444';
        elements.statusText.textContent = 'Sync Failed';
        
        showToast(`Error: ${error.message || 'Could not connect to server'}`, 'error');
        
        // Show empty/error state if no data is loaded
        if (state.releases.length === 0) {
            elements.releasesGrid.innerHTML = `
                <div class="no-results">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h3>Failed to load release notes</h3>
                    <p>${error.message || 'Check your internet connection and try again.'}</p>
                    <button class="filter-chip active" style="margin-top: 1.5rem;" onclick="location.reload()">Retry Connection</button>
                </div>
            `;
        }
    }
}

// Calculate Statistics
function calculateAndRenderStats() {
    const total = state.releases.length;
    const features = state.releases.filter(r => r.type.toLowerCase().includes('feature')).length;
    const changes = state.releases.filter(r => r.type.toLowerCase().includes('change')).length;
    const deprecations = state.releases.filter(r => 
        r.type.toLowerCase().includes('deprecation') || 
        r.type.toLowerCase().includes('remove') ||
        r.type.toLowerCase().includes('deleted')
    ).length;
    
    // Animate stats counter
    animateCounter(elements.statTotal, total);
    animateCounter(elements.statFeatures, features);
    animateCounter(elements.statChanges, changes);
    animateCounter(elements.statDeprecations, deprecations);
}

function animateCounter(element, targetValue) {
    let current = 0;
    const duration = 800; // ms
    const stepTime = Math.max(Math.floor(duration / (targetValue || 1)), 15);
    
    // Reset element
    element.textContent = '0';
    if (targetValue === 0) return;
    
    const timer = setInterval(() => {
        current += Math.ceil(targetValue / 20); // increment by steps
        if (current >= targetValue) {
            element.textContent = targetValue;
            clearInterval(timer);
        } else {
            element.textContent = current;
        }
    }, stepTime);
}

// Filters & Search logic
function applyFiltersAndRender() {
    state.filteredReleases = state.releases.filter(item => {
        // 1. Filter by category chip
        const matchesCategory = state.activeFilter === 'all' || 
            (state.activeFilter === 'feature' && item.type.toLowerCase().includes('feature')) ||
            (state.activeFilter === 'change' && item.type.toLowerCase().includes('change')) ||
            (state.activeFilter === 'deprecation' && (
                item.type.toLowerCase().includes('deprecation') || 
                item.type.toLowerCase().includes('remove') ||
                item.type.toLowerCase().includes('deleted')
            ));
            
        // 2. Filter by search text
        const matchesSearch = !state.searchQuery || 
            item.text.toLowerCase().includes(state.searchQuery) ||
            item.type.toLowerCase().includes(state.searchQuery) ||
            item.date.toLowerCase().includes(state.searchQuery);
            
        return matchesCategory && matchesSearch;
    });
    
    // Update count labels
    elements.totalCount.textContent = state.releases.length;
    elements.filteredCount.textContent = state.filteredReleases.length;
    
    renderReleasesGrid();
}

// Render release notes grid
function renderReleasesGrid() {
    elements.releasesGrid.innerHTML = '';
    
    if (state.filteredReleases.length === 0) {
        elements.releasesGrid.innerHTML = `
            <div class="no-results">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <h3>No matching release notes</h3>
                <p>Try modifying your search or choosing a different filter category.</p>
            </div>
        `;
        return;
    }
    
    state.filteredReleases.forEach((item, index) => {
        const card = document.createElement('article');
        card.className = 'release-card';
        card.style.animationDelay = `${Math.min(index * 0.05, 0.8)}s`;
        
        // Determine type badge class
        let badgeClass = 'update';
        const typeLower = item.type.toLowerCase();
        if (typeLower.includes('feature')) badgeClass = 'feature';
        else if (typeLower.includes('change')) badgeClass = 'change';
        else if (typeLower.includes('deprecation') || typeLower.includes('remove')) badgeClass = 'deprecation';
        
        card.innerHTML = `
            <div class="release-header">
                <span class="release-date">${item.date}</span>
                <span class="badge ${badgeClass}">${item.type}</span>
            </div>
            <div class="release-body">
                ${item.html}
            </div>
            <div class="release-footer">
                <a href="${item.link}" target="_blank" class="btn-link" title="View official release notes">
                    <span>Release Docs</span>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                    </svg>
                </a>
                <button class="btn-tweet" data-id="${item.id}" title="Compose a Tweet about this release">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Tweet
                </button>
            </div>
        `;
        
        // Add event listener to the Tweet button
        const tweetBtn = card.querySelector('.btn-tweet');
        tweetBtn.addEventListener('click', () => {
            prepareAndOpenTweetModal(item);
        });
        
        elements.releasesGrid.appendChild(card);
    });
}

// Tweet Modal Operations
function prepareAndOpenTweetModal(item) {
    const date = item.date;
    const type = item.type.toUpperCase();
    const link = item.link;
    const bodyText = item.text;
    
    // Construct pre-filled tweet carefully fitting the 280 char limit
    const prefix = `📢 BigQuery Update (${date})\n[${type}]: `;
    const suffix = `\n\nRead more: ${link}\n#BigQuery #GoogleCloud`;
    
    const remainingForBody = MAX_TWEET_CHARS - prefix.length - suffix.length;
    let truncatedBody = bodyText;
    
    if (bodyText.length > remainingForBody) {
        truncatedBody = bodyText.substring(0, remainingForBody - 3) + "...";
    }
    
    const fullTweetText = prefix + truncatedBody + suffix;
    
    // Update Modal DOM
    elements.tweetContent.value = fullTweetText;
    state.currentTweet.text = fullTweetText;
    state.currentTweet.link = link;
    
    updateTweetCharCount();
    
    // Open Modal
    elements.tweetModal.classList.add('active');
    elements.tweetContent.focus();
}

function closeTweetModal() {
    elements.tweetModal.classList.remove('active');
}

function handleTweetInput(e) {
    state.currentTweet.text = e.target.value;
    updateTweetCharCount();
}

function updateTweetCharCount() {
    const length = state.currentTweet.text.length;
    const remaining = MAX_TWEET_CHARS - length;
    
    elements.charCountText.textContent = remaining;
    
    // Progress Ring Calculations
    const circleRadius = 8;
    const circumference = 2 * Math.PI * circleRadius; // ~50.26
    
    // Set up ring
    elements.progressFill.style.strokeDasharray = `${circumference} ${circumference}`;
    
    // Calculate percentage filled
    const percentage = Math.min(length / MAX_TWEET_CHARS, 1);
    const strokeOffset = circumference - (percentage * circumference);
    elements.progressFill.style.strokeDashoffset = strokeOffset;
    
    // UI indicators when limit reached/exceeded
    if (remaining < 0) {
        elements.charCounter.classList.add('limit-reached');
        elements.postTweetBtn.disabled = true;
    } else {
        elements.charCounter.classList.remove('limit-reached');
        elements.postTweetBtn.disabled = false;
    }
    
    // Warning state coloring
    if (remaining <= 20 && remaining >= 0) {
        elements.progressFill.style.stroke = '#f59e0b'; // Amber warning
    } else if (remaining < 0) {
        elements.progressFill.style.stroke = '#ef4444'; // Red error
    } else {
        elements.progressFill.style.stroke = 'var(--primary-color)'; // Default primary
    }
}

// Copy Tweet Text
function copyTweetText() {
    const textToCopy = elements.tweetContent.value;
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            showToast('Tweet text copied to clipboard!', 'success');
        })
        .catch(err => {
            console.error('Failed to copy: ', err);
            showToast('Failed to copy text. Please select and copy manually.', 'error');
        });
}

// Open Twitter Web Intent
function postTweetOnTwitter() {
    const tweetText = elements.tweetContent.value;
    
    if (tweetText.length > MAX_TWEET_CHARS) {
        showToast('Tweet is too long! Please shorten it before posting.', 'error');
        return;
    }
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank');
    closeTweetModal();
    showToast('Redirected to Twitter/X to post your update!', 'success');
}

// Toast Notification Manager
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Toast Icons
    let icon = '';
    if (type === 'success') {
        icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
        icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else if (type === 'warning') {
        icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    }
    
    toast.innerHTML = `${icon} <span>${message}</span>`;
    elements.toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('active'), 50);
    
    // Remove toast after duration
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
