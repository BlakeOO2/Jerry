// database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Paths to different SQLite databases
const snipeDbPath = path.join(__dirname, '../database/snipeData.sqlite');
const inviteDbPath = path.join(__dirname, '../database/inviteTracker.sqlite');

console.log('Snipe Database path:', snipeDbPath);
console.log('Invite Database path:', inviteDbPath);

// Connect to snipe database
const snipeDb = new sqlite3.Database(snipeDbPath, (err) => {
    if (err) {
        console.error('❌ Error connecting to snipe database:', err.message);
    } else {
        console.log(`✅ Connected to snipe database: ${snipeDbPath}`);
    }
});

// Connect to invite database
const inviteDb = new sqlite3.Database(inviteDbPath, (err) => {
    if (err) {
        console.error('❌ Error connecting to invite database:', err.message);
    } else {
        console.log(`✅ Connected to invite database: ${inviteDbPath}`);
    }
});
inviteDb.get("SELECT name FROM sqlite_master WHERE type='table' AND name='invites'", (err, row) => {
    if (err) {
        console.error('Error checking invites table:', err);
    } else {
        console.log('Invites table exists:', !!row);
    }
});

// Create snipe table
snipeDb.serialize(() => {
    snipeDb.run(`
        CREATE TABLE IF NOT EXISTS snipeData (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channelId TEXT,
            userId TEXT,
            username TEXT,
            message TEXT,
            image TEXT,
            timestamp INTEGER
        )
    `, (err) => {
        if (err) {
            console.error('❌ Error creating snipe table:', err.message);
        } else {
            console.log('✅ Table "snipeData" is ready.');
        }
    });
});

// Create invite tables
inviteDb.serialize(() => {
    // Invites table
    inviteDb.run(`
        CREATE TABLE IF NOT EXISTS invites (
            userId TEXT PRIMARY KEY,
            username TEXT,
            regularInvites INTEGER DEFAULT 0,
            leftInvites INTEGER DEFAULT 0,
            fakeInvites INTEGER DEFAULT 0,
            bonusInvites INTEGER DEFAULT 0,
            totalInvites INTEGER DEFAULT 0
        )
    `, (err) => {
        if (err) {
            console.error('❌ Error creating invites table:', err.message);
        } else {
            console.log('✅ Table "invites" is ready.');
        }
    });

    // Invite tracking table
    inviteDb.run(`
        CREATE TABLE IF NOT EXISTS inviteTracking (
            invitedId TEXT PRIMARY KEY,
            inviterId TEXT,
            timestamp INTEGER,
            FOREIGN KEY(inviterId) REFERENCES invites(userId)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Error creating inviteTracking table:', err.message);
        } else {
            console.log('✅ Table "inviteTracking" is ready.');
        }
    });
});

// Snipe Functions
async function saveDeletedMessage(channelId, userId, username, message, image, timestamp) {
    return new Promise((resolve, reject) => {
        const stmt = snipeDb.prepare(`
            INSERT INTO snipeData (channelId, userId, username, message, image, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run([channelId, userId, username, message, image, timestamp], function(err) {
            if (err) {
                console.error('❌ Error saving message:', err);
                reject(err);
            } else {
                console.log('✅ Message saved successfully');
                resolve(this.lastID);
            }
        });
        
        stmt.finalize();
    });
}

async function getDeletedMessages(channelId, userId = null, limit = 1, offset = 0) {
    return new Promise((resolve, reject) => {
        console.log('Fetching messages with params:', { channelId, userId, limit, offset });
        
        let query = 'SELECT * FROM snipeData WHERE channelId = ?';
        const params = [channelId];

        if (userId) {
            query += ' AND userId = ?';
            params.push(userId);
        }

        query += ' ORDER BY timestamp DESC';

        snipeDb.all(query, params, (err, rows) => {
            if (err) {
                console.error('❌ Error fetching from database:', err);
                reject(err);
            } else {
                console.log(`✅ Found ${rows.length} messages total`);
                const paginatedRows = rows.slice(offset, offset + limit);
                console.log(`✅ Returning ${paginatedRows.length} messages after pagination`);
                resolve(paginatedRows);
            }
        });
    });
}

// Invite Functions
async function updateInvites(userId, username, type, amount) {
    return new Promise((resolve, reject) => {
        inviteDb.run(`
            INSERT INTO invites (userId, username, ${type}Invites, totalInvites)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(userId) DO UPDATE SET
            ${type}Invites = ${type}Invites + ?,
            totalInvites = totalInvites + ?,
            username = ?
        `, [userId, username, amount, amount, amount, amount, username], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

async function getInvites(userId) {
    return new Promise((resolve, reject) => {
        inviteDb.get('SELECT * FROM invites WHERE userId = ?', [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row || {
                regularInvites: 0,
                leftInvites: 0,
                fakeInvites: 0,
                bonusInvites: 0,
                totalInvites: 0
            });
        });
    });
}

async function getLeaderboard(page = 1, limit = 10) {
    return new Promise((resolve, reject) => {
        const offset = (page - 1) * limit;
        inviteDb.all(`
            SELECT *
            FROM invites
            ORDER BY totalInvites DESC
            LIMIT ? OFFSET ?
        `, [limit, offset], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function trackInvite(invitedId, inviterId) {
    return new Promise((resolve, reject) => {
        inviteDb.run(`
            INSERT OR REPLACE INTO inviteTracking (invitedId, inviterId, timestamp)
            VALUES (?, ?, ?)
        `, [invitedId, inviterId, Date.now()], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

async function getInviter(invitedId) {
    return new Promise((resolve, reject) => {
        inviteDb.get('SELECT inviterId FROM inviteTracking WHERE invitedId = ?', [invitedId], (err, row) => {
            if (err) reject(err);
            else resolve(row?.inviterId);
        });
    });
}

async function resetInvites(userId) {
    return new Promise((resolve, reject) => {
        inviteDb.run(`
            UPDATE invites 
            SET regularInvites = 0, 
                leftInvites = 0, 
                fakeInvites = 0, 
                bonusInvites = 0, 
                totalInvites = 0 
            WHERE userId = ?
        `, [userId], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}



// Export all functions
module.exports = {
    snipeDb,
    inviteDb,
    // Snipe exports
    saveDeletedMessage,
    getDeletedMessages,
    // Invite tracking exports
    updateInvites,
    getInvites,
    getLeaderboard,
    trackInvite,
    getInviter,
    resetInvites
};
