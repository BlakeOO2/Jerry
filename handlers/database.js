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

// Add this with your other database connections
const suggestionDb = new sqlite3.Database(path.join(__dirname, '../database/suggestions.sqlite'), (err) => {
    if (err) {
        console.error('❌ Error connecting to suggestion database:', err.message);
    } else {
        console.log('✅ Connected to suggestion database');
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
// Add this to your database initialization
suggestionDb.serialize(() => {
    suggestionDb.run(`
        CREATE TABLE IF NOT EXISTS suggestions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guildId TEXT,
            channelId TEXT,
            messageId TEXT,
            authorId TEXT,
            content TEXT,
            status TEXT DEFAULT 'pending',
            threadId TEXT,
            upvotes INTEGER DEFAULT 0,
            downvotes INTEGER DEFAULT 0,
            threadMessages INTEGER DEFAULT 0,
            decidedBy TEXT,
            reason TEXT
        )
    `);
    suggestionDb.run(`
        CREATE TABLE IF NOT EXISTS suggestion_votes (
            suggestion_id INTEGER,
            user_id TEXT,
            vote_type TEXT,
            PRIMARY KEY (suggestion_id, user_id),
            FOREIGN KEY (suggestion_id) REFERENCES suggestions(id)
        )
    `);
    suggestionDb.run(`
        CREATE TABLE IF NOT EXISTS suggestion_channels (
            guild_id TEXT,
            channel_id TEXT,
            PRIMARY KEY (guild_id, channel_id)
        )
    `);
});

// Add these functions to your exports
async function createSuggestion(guildId, channelId, messageId, authorId, content) {
    return new Promise((resolve, reject) => {
        suggestionDb.run(`
            INSERT INTO suggestions (guildId, channelId, messageId, authorId, content, status)
            VALUES (?, ?, ?, ?, ?, 'pending')`,
            [guildId, channelId, messageId, authorId, content],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}
async function addSuggestionChannel(guildId, channelId) {
    return new Promise((resolve, reject) => {
        suggestionDb.run(
            'INSERT OR REPLACE INTO suggestion_channels (guild_id, channel_id) VALUES (?, ?)',
            [guildId, channelId],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
}

async function removeSuggestionChannel(guildId, channelId) {
    return new Promise((resolve, reject) => {
        suggestionDb.run(
            'DELETE FROM suggestion_channels WHERE guild_id = ? AND channel_id = ?',
            [guildId, channelId],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
}

async function isSuggestionChannel(guildId, channelId) {
    return new Promise((resolve, reject) => {
        suggestionDb.get(
            'SELECT * FROM suggestion_channels WHERE guild_id = ? AND channel_id = ?',
            [guildId, channelId],
            (err, row) => {
                if (err) reject(err);
                else resolve(!!row);
            }
        );
    });
}

async function updateSuggestionStatus(id, status, decidedBy = null, reason = null) {
    return new Promise((resolve, reject) => {
        suggestionDb.run(
            'UPDATE suggestions SET status = ?, decidedBy = ?, reason = ? WHERE id = ?',
            [status, decidedBy, reason, id],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
}

async function getSuggestion(id) {
    return new Promise((resolve, reject) => {
        suggestionDb.get('SELECT * FROM suggestions WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}
async function toggleVote(suggestionId, userId, voteType) {
    return new Promise((resolve, reject) => {
        suggestionDb.serialize(() => {
            // Check if user has already voted
            suggestionDb.get(
                'SELECT * FROM suggestion_votes WHERE suggestion_id = ? AND user_id = ?',
                [suggestionId, userId],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (row) {
                        // User has already voted
                        if (row.vote_type === voteType) {
                            // Remove vote if clicking same button
                            suggestionDb.run(
                                'DELETE FROM suggestion_votes WHERE suggestion_id = ? AND user_id = ?',
                                [suggestionId, userId]
                            );
                            resolve({ action: 'removed', previousVote: voteType });
                        } else {
                            // Change vote if clicking different button
                            suggestionDb.run(
                                'UPDATE suggestion_votes SET vote_type = ? WHERE suggestion_id = ? AND user_id = ?',
                                [voteType, suggestionId, userId]
                            );
                            resolve({ action: 'changed', previousVote: row.vote_type });
                        }
                    } else {
                        // Add new vote
                        suggestionDb.run(
                            'INSERT INTO suggestion_votes (suggestion_id, user_id, vote_type) VALUES (?, ?, ?)',
                            [suggestionId, userId, voteType]
                        );
                        resolve({ action: 'added' });
                    }
                }
            );
        });
    });
}

async function getVoteCounts(suggestionId) {
    return new Promise((resolve, reject) => {
        suggestionDb.get(
            `SELECT 
                SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE 0 END) as upvotes,
                SUM(CASE WHEN vote_type = 'downvote' THEN 1 ELSE 0 END) as downvotes
            FROM suggestion_votes 
            WHERE suggestion_id = ?`,
            [suggestionId],
            (err, row) => {
                if (err) reject(err);
                else resolve({
                    upvotes: row?.upvotes || 0,
                    downvotes: row?.downvotes || 0
                });
            }
        );
    });
}

async function updateThreadCount(suggestionId, count) {
    return new Promise((resolve, reject) => {
        suggestionDb.run(
            'UPDATE suggestions SET threadMessages = ? WHERE id = ?',
            [count, suggestionId],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
}



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
    resetInvites,
    createSuggestion,
    updateSuggestionStatus,
    getSuggestion,
    toggleVote,
    getVoteCounts,
    updateThreadCount,
    addSuggestionChannel,
    removeSuggestionChannel,
    isSuggestionChannel
};
