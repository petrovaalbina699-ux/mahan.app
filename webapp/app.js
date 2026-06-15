// Configuration
const CONFIG = {
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/library/d/11QW77QyiS55_M8gRtmvmPEl2DMowFE7mCdfZdrvu5owhYNsoldmNgiE1/12', // Replace with your Google Apps Script URL
    SHEET_NAME: 'Users',
};

// State management
const state = {
    currentUser: null,
    currentScreen: 'loading',
    telegramUserId: null,
    userData: {},
};

// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;

// DOM Elements
const screens = {
    loading: document.getElementById('loading-screen'),
    auth: document.getElementById('auth-screen'),
    menu: document.getElementById('menu-screen'),
    reports: document.getElementById('reports-screen'),
    orders: document.getElementById('orders-screen'),
    completed: document.getElementById('completed-screen'),
};

const buttons = {
    auth: document.getElementById('auth-btn'),
    logout: document.getElementById('logout-btn'),
};

// Initialize app
function init() {
    console.log('Initializing MAHAN WebApp...');

    // Setup Telegram WebApp
    tg.ready();
    tg.setHeaderColor('#a67c52');
    tg.setBackgroundColor('#f5f1ed');

    // Get Telegram user data
    const user = tg.initDataUnsafe?.user;
    
    if (user) {
        state.telegramUserId = user.id;
        console.log('Telegram User ID:', state.telegramUserId);
        
        // Attempt to authenticate
        authenticateUser(user);
    } else {
        console.warn('No Telegram user data found');
        showScreen('auth');
    }

    // Setup event listeners
    setupEventListeners();
}

// Authentication function
async function authenticateUser(telegramUser) {
    try {
        showScreen('loading');
        
        // Prepare user data
        const userData = {
            telegramId: telegramUser.id,
            firstName: telegramUser.first_name || 'Unknown',
            lastName: telegramUser.last_name || '',
            username: telegramUser.username || '',
            languageCode: telegramUser.language_code || 'ru',
        };

        // Call Google Apps Script to authenticate/register user
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'authenticate',
                userData: userData,
            }),
        });

        const result = await response.json();

        if (result.success) {
            state.currentUser = result.user;
            state.userData = result.userData || {};
            
            console.log('Authentication successful:', state.currentUser);
            
            // Load user to menu
            setTimeout(() => showScreen('menu'), 500);
        } else {
            console.error('Authentication failed:', result.message);
            showScreen('auth');
        }
    } catch (error) {
        console.error('Authentication error:', error);
        showScreen('auth');
    }
}

// Manual auth button (for testing without Telegram)
function manualAuth() {
    const testUser = {
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        language_code: 'ru',
    };
    
    authenticateUser(testUser);
}

// Screen management
function showScreen(screenName) {
    // Hide all screens
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });

    // Show target screen
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
        state.currentScreen = screenName;
        console.log('Switched to screen:', screenName);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Auth button
    buttons.auth.addEventListener('click', manualAuth);

    // Logout button
    buttons.logout.addEventListener('click', logout);

    // Menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            navigateToSection(section);
        });
    });

    // Back buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => showScreen('menu'));
    });
}

// Navigate to section
function navigateToSection(section) {
    const sectionMap = {
        reports: 'reports',
        orders: 'orders',
        completed: 'completed',
    };

    if (sectionMap[section]) {
        showScreen(sectionMap[section]);
    }
}

// Logout function
function logout() {
    state.currentUser = null;
    state.userData = {};
    state.telegramUserId = null;
    showScreen('auth');
}

// Utility function to save data to Google Sheet
async function saveToGoogleSheet(sheetName, data) {
    try {
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'saveData',
                sheetName: sheetName,
                data: data,
                telegramId: state.telegramUserId,
            }),
        });

        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('Error saving to Google Sheet:', error);
        return false;
    }
}

// Utility function to fetch data from Google Sheet
async function getFromGoogleSheet(sheetName, query) {
    try {
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'getData',
                sheetName: sheetName,
                query: query,
                telegramId: state.telegramUserId,
            }),
        });

        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error('Error fetching from Google Sheet:', error);
        return [];
    }
}

// Update user display name
function updateUserDisplay() {
    if (state.currentUser) {
        document.getElementById('user-name').textContent = 
            state.currentUser.firstName || 'Пользователь';
    }
}

// Telegram WebApp event handlers
tg.onEvent('mainButtonClicked', () => {
    console.log('Main button clicked');
});

tg.onEvent('backButtonClicked', () => {
    if (state.currentScreen !== 'menu') {
        showScreen('menu');
    } else {
        tg.close();
    }
});

// Disable backButton initially
tg.BackButton.hide();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    init();
});

// Handle app visibility
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('App hidden');
    } else {
        console.log('App visible');
    }
});
