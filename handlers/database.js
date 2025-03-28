// database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to SQLite database
const dbPath = path.join(__dirname, '../database/snipeData.sqlite');
console.log('Database path:', dbPath);

// Connect to the database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error connecting to database:', err.message);
    } else {
        console.log(`✅ Connected to database: ${dbPath}`);
    }
});

// Create table
db.serialize(() => {
    db.run(`
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
            console.error('❌ Error creating table:', err.message);
        } else {
            console.log('✅ Table "snipeData" is ready.');
        }
    });
});

// Function to save a deleted message
async function saveDeletedMessage(channelId, userId, username, message, image, timestamp) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`
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

// Function to get deleted messages
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

        console.log('Executing query:', query, 'with params:', params);

        db.all(query, params, (err, rows) => {
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

// Export all functions
module.exports = {
    db,
    saveDeletedMessage,
    getDeletedMessages
};
