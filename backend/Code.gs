// Google Apps Script for MAHAN WebApp Backend
// This script manages user authentication and data storage

// Configuration
const SPREADSHEET_ID = '1LtXv6p8n-yeu-NrScdl_vuZLGC-ar4pqPslIEALlh_g';
const BOT_TOKEN = '8472781766:AAEgRPYd42NAVXTSsLB0hrs6XhBICDhC50M';
const WEBAPP_URL = 'https://petrovaalbina699-ux.github.io/mahan.app/';

const SHEET_NAMES = {
    USERS: 'Users',
    REPORTS: 'Reports',
    ORDERS: 'Orders',
    COMPLETED_ORDERS: 'CompletedOrders',
};

// Main POST handler for WebApp requests
function doPost(e) {
    try {
        // Telegram webhook updates
        if (e.postData && e.postData.contents) {
            const payload = JSON.parse(e.postData.contents);
            
            // Check if this is a Telegram update
            if (payload.message) {
                return handleTelegramUpdate(payload);
            }
            
            // Otherwise it's a WebApp request
            const action = payload.action;
            switch (action) {
                case 'authenticate':
                    return handleAuthenticate(payload);
                case 'saveData':
                    return handleSaveData(payload);
                case 'getData':
                    return handleGetData(payload);
                default:
                    return sendError('Unknown action: ' + action);
            }
        }
        
        return sendSuccess({ message: 'OK' });
    } catch (error) {
        Logger.log('Error in doPost: ' + error);
        return sendError(error.toString());
    }
}

// Handle Telegram webhook updates
function handleTelegramUpdate(payload) {
    try {
        const message = payload.message;
        const chatId = message.chat.id;
        const userId = message.from.id;
        const text = message.text;
        
        Logger.log('Telegram message from ' + userId + ': ' + text);
        
        // Handle /start command
        if (text === '/start') {
            sendWebAppButton(chatId);
        }
        
        return ContentService.createTextOutput('ok');
    } catch (error) {
        Logger.log('Error handling Telegram update: ' + error);
        return ContentService.createTextOutput('error');
    }
}

// Send WebApp button to user
function sendWebAppButton(chatId) {
    const payload = {
        chat_id: chatId,
        text: '👋 Добро пожаловать в MAHAN!\n\nНажмите кнопку ниже, чтобы открыть приложение:',
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '📱 Открыть MAHAN',
                        web_app: {
                            url: WEBAPP_URL
                        }
                    }
                ]
            ]
        }
    };

    const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = UrlFetchApp.fetch(url, options);
    
    Logger.log('WebApp button sent: ' + response.getContentText());
}

// Handle user authentication
function handleAuthenticate(payload) {
    try {
        const userData = payload.userData;
        const telegramId = userData.telegramId;

        // Get or create user
        let user = findUserByTelegramId(telegramId);

        if (!user) {
            user = createUser(userData);
        }

        return sendSuccess({
            user: user,
            userData: user,
        });
    } catch (error) {
        return sendError('Authentication failed: ' + error);
    }
}

// Handle data saving
function handleSaveData(payload) {
    try {
        const sheetName = payload.sheetName;
        const data = payload.data;
        const telegramId = payload.telegramId;

        if (!sheetName || !data) {
            return sendError('Missing required fields: sheetName or data');
        }

        // Add metadata
        data.telegramId = telegramId;
        data.timestamp = new Date().toISOString();

        // Get sheet
        const sheet = getSheet(sheetName);
        if (!sheet) {
            return sendError('Sheet not found: ' + sheetName);
        }

        // Append row
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const row = headers.map(header => data[header] || '');
        sheet.appendRow(row);

        return sendSuccess({
            message: 'Data saved successfully',
            rowNumber: sheet.getLastRow(),
        });
    } catch (error) {
        return sendError('Save failed: ' + error);
    }
}

// Handle data retrieval
function handleGetData(payload) {
    try {
        const sheetName = payload.sheetName;
        const query = payload.query || {};
        const telegramId = payload.telegramId;

        const sheet = getSheet(sheetName);
        if (!sheet) {
            return sendError('Sheet not found: ' + sheetName);
        }

        // Get all data
        const data = sheet.getDataRange().getValues();
        const headers = data[0];

        // Filter data
        let results = [];
        for (let i = 1; i < data.length; i++) {
            let row = {};
            for (let j = 0; j < headers.length; j++) {
                row[headers[j]] = data[i][j];
            }

            // Apply filters
            let matches = true;
            for (let key in query) {
                if (row[key] != query[key]) {
                    matches = false;
                    break;
                }
            }

            // Filter by telegramId if not admin
            if (telegramId && row.telegramId && row.telegramId != telegramId) {
                matches = false;
            }

            if (matches) {
                results.push(row);
            }
        }

        return sendSuccess({
            data: results,
            count: results.length,
        });
    } catch (error) {
        return sendError('Fetch failed: ' + error);
    }
}

// User management functions
function findUserByTelegramId(telegramId) {
    try {
        const sheet = getSheet(SHEET_NAMES.USERS);
        const data = sheet.getDataRange().getValues();

        for (let i = 1; i < data.length; i++) {
            if (data[i][1] == telegramId) { // Column B = telegramId
                return {
                    id: data[i][0],
                    telegramId: data[i][1],
                    firstName: data[i][2],
                    lastName: data[i][3],
                    username: data[i][4],
                    createdAt: data[i][5],
                };
            }
        }

        return null;
    } catch (error) {
        Logger.log('Error finding user: ' + error);
        return null;
    }
}

function createUser(userData) {
    try {
        const sheet = getSheet(SHEET_NAMES.USERS);
        const timestamp = new Date().toISOString();

        const newUser = [
            Utilities.getUuid(),
            userData.telegramId,
            userData.firstName,
            userData.lastName || '',
            userData.username || '',
            timestamp,
        ];

        sheet.appendRow(newUser);

        return {
            id: newUser[0],
            telegramId: newUser[1],
            firstName: newUser[2],
            lastName: newUser[3],
            username: newUser[4],
            createdAt: newUser[5],
        };
    } catch (error) {
        Logger.log('Error creating user: ' + error);
        return null;
    }
}

// Sheet management
function getSheet(sheetName) {
    try {
        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        let sheet = spreadsheet.getSheetByName(sheetName);

        if (!sheet) {
            sheet = createSheet(spreadsheet, sheetName);
        }

        return sheet;
    } catch (error) {
        Logger.log('Error getting sheet: ' + error);
        return null;
    }
}

function createSheet(spreadsheet, sheetName) {
    try {
        const sheet = spreadsheet.insertSheet(sheetName);

        // Create headers based on sheet type
        let headers = [];
        if (sheetName === SHEET_NAMES.USERS) {
            headers = ['id', 'telegramId', 'firstName', 'lastName', 'username', 'createdAt'];
        } else if (sheetName === SHEET_NAMES.REPORTS) {
            headers = ['id', 'telegramId', 'date', 'shift', 'income', 'expenses', 'notes', 'createdAt'];
        } else if (sheetName === SHEET_NAMES.ORDERS) {
            headers = ['id', 'telegramId', 'orderType', 'quantity', 'amount', 'description', 'status', 'createdAt'];
        } else if (sheetName === SHEET_NAMES.COMPLETED_ORDERS) {
            headers = ['id', 'telegramId', 'orderId', 'completedAt', 'notes', 'createdAt'];
        }

        if (headers.length > 0) {
            sheet.appendRow(headers);
        }

        return sheet;
    } catch (error) {
        Logger.log('Error creating sheet: ' + error);
        return null;
    }
}

// Utility functions
function sendSuccess(data) {
    return ContentService
        .createTextOutput(JSON.stringify({
            success: true,
            ...data,
        }))
        .setMimeType(ContentService.MimeType.JSON);
}

function sendError(message) {
    return ContentService
        .createTextOutput(JSON.stringify({
            success: false,
            message: message,
        }))
        .setMimeType(ContentService.MimeType.JSON);
}

// GET handler for Telegram webhook verification
function doGet(e) {
    return HtmlService.createHtmlOutput('✅ MAHAN Telegram Bot is Active');
}

// Debug function - can be called manually
function testAuthenticate() {
    const testData = {
        action: 'authenticate',
        userData: {
            telegramId: 123456789,
            firstName: 'Test',
            lastName: 'User',
            username: 'testuser',
            languageCode: 'ru',
        },
    };

    const result = handleAuthenticate(testData);
    Logger.log(result.getContent());
}
