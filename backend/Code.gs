// Google Apps Script for MAHAN WebApp Backend
// This script manages user authentication and data storage

// Configuration
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // Replace with your Google Sheet ID
const SHEET_NAMES = {
    USERS: 'Users',
    REPORTS: 'Reports',
    ORDERS: 'Orders',
    COMPLETED_ORDERS: 'CompletedOrders',
};

// Main POST handler
function doPost(e) {
    try {
        const payload = JSON.parse(e.postData.contents);
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
    } catch (error) {
        Logger.log('Error in doPost: ' + error);
        return sendError(error.toString());
    }
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
