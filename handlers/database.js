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
const ticketDb = new sqlite3.Database(path.join(__dirname, '../database/tickets.sqlite'), (err) => {
    if (err) {
        console.error('❌ Error connecting to ticket database:', err.message);
    } else {
        console.log('✅ Connected to ticket database');
    }
});

const reactionRolesDb = new sqlite3.Database(path.join(__dirname, '../database/reactionRoles.sqlite'), (err) => {
    if (err) {
        console.error('❌ Error connecting to reaction roles database:', err.message);
    } else {
        console.log('✅ Connected to reaction roles database');
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
const giveawayDb = new sqlite3.Database(path.join(__dirname, '../database/giveaways.sqlite'), (err) => {
    if (err) {
        console.error('❌ Error connecting to giveaway database:', err.message);
    } else {
        console.log('✅ Connected to giveaway database');
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

ticketDb.serialize(() => {
    ticketDb.run(`
        CREATE TABLE IF NOT EXISTS ticket_counters (
            guild_id TEXT PRIMARY KEY,
            counter INTEGER DEFAULT 0
        )
    `);
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

reactionRolesDb.serialize(() => {
    reactionRolesDb.run(`
        CREATE TABLE IF NOT EXISTS reaction_role_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT,
            channel_id TEXT,
            discord_message_id TEXT UNIQUE,
            title TEXT,
            description TEXT
        )
    `);

    reactionRolesDb.run(`
        CREATE TABLE IF NOT EXISTS reaction_roles (
            discord_message_id TEXT,
            emoji TEXT,
            role_id TEXT,
            FOREIGN KEY(discord_message_id) REFERENCES reaction_role_messages(discord_message_id),
            PRIMARY KEY(discord_message_id, emoji)
        )
    `);
});


// Initialize giveaway tables
giveawayDb.serialize(() => {
    giveawayDb.run(`
        CREATE TABLE IF NOT EXISTS giveaways (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT,
            channel_id TEXT,
            message_id TEXT,
            prize TEXT,
            description TEXT,
            winner_count INTEGER,
            host_id TEXT,
            end_time INTEGER,
            requires_approval BOOLEAN,
            approval_channel_id TEXT,
            status TEXT DEFAULT 'active'
        )
    `);

    giveawayDb.run(`
        CREATE TABLE IF NOT EXISTS giveaway_entries (
            giveaway_id INTEGER,
            user_id TEXT,
            entry_time INTEGER,
            status TEXT DEFAULT 'pending',
            FOREIGN KEY(giveaway_id) REFERENCES giveaways(id),
            PRIMARY KEY(giveaway_id, user_id)
        )
    `);
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

// Reminders database
const remindersDb = new sqlite3.Database(path.join(__dirname, '../database/reminders.sqlite'), (err) => {
    if (err) {
        console.error('❌ Error connecting to reminders database:', err.message);
    } else {
        console.log('✅ Connected to reminders database');
    }
});

remindersDb.serialize(() => {
    remindersDb.run(`
        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT NOT NULL,
            message TEXT NOT NULL,
            remindAt INTEGER NOT NULL,
            channelId TEXT,
            createdAt INTEGER NOT NULL
        )
    `, (err) => {
        if (err) {
            console.error('❌ Error creating reminders table:', err.message);
        } else {
            console.log('✅ Table "reminders" is ready.');
        }
    });
});

// Reminder functions
async function createReminder(userId, message, remindAt, channelId) {
    return new Promise((resolve, reject) => {
        remindersDb.run(`
            INSERT INTO reminders (userId, message, remindAt, channelId, createdAt)
            VALUES (?, ?, ?, ?, ?)
        `, [userId, message, remindAt, channelId, Date.now()], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

async function getDueReminders(until) {
    return new Promise((resolve, reject) => {
        remindersDb.all(`
            SELECT * FROM reminders WHERE remindAt <= ?
        `, [until], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function deleteReminder(id) {
    return new Promise((resolve, reject) => {
        remindersDb.run(`DELETE FROM reminders WHERE id = ?`, [id], function(err) {
            if (err) reject(err);
            else resolve(this.changes > 0);
        });
    });
}

async function getUserReminders(userId) {
    return new Promise((resolve, reject) => {
        remindersDb.all(`SELECT * FROM reminders WHERE userId = ? ORDER BY remindAt ASC`, [userId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Add this with your other database functions
async function createReactionRoleMessage(guildId, channelId, messageId, title, description) {
    return new Promise((resolve, reject) => {
        reactionRolesDb.run(`
            INSERT INTO reaction_role_messages (guild_id, channel_id, discord_message_id, title, description)
            VALUES (?, ?, ?, ?, ?)
        `, [guildId, channelId, messageId, title, description], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

async function addReactionRole(messageId, emoji, roleId) {
    return new Promise((resolve, reject) => {
        console.log('Adding reaction role:', { messageId, emoji, roleId });
        reactionRolesDb.run(`
            INSERT OR REPLACE INTO reaction_roles (discord_message_id, emoji, role_id)
            VALUES (?, ?, ?)
        `, [messageId, emoji, roleId], function(err) {
            if (err) {
                console.error('Database error:', err);
                reject(err);
            } else {
                console.log('Added reaction role successfully');
                resolve(this.changes > 0);
            }
        });
    });
}

async function getReactionRoleMessage(discordMessageId) {
    return new Promise((resolve, reject) => {
        reactionRolesDb.get(`
            SELECT * FROM reaction_role_messages
            WHERE discord_message_id = ?
        `, [discordMessageId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

async function getReactionRoles(messageId) {
    return new Promise((resolve, reject) => {
        console.log('Getting roles for message:', messageId);
        reactionRolesDb.all(`
            SELECT * FROM reaction_roles
            WHERE discord_message_id = ?
        `, [messageId], (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                reject(err);
            } else {
                console.log('Found roles:', rows);
                resolve(rows || []);
            }
        });
    });
}

async function removeReactionRole(messageId, emoji) {
    return new Promise((resolve, reject) => {
        console.log('Removing reaction role:', { messageId, emoji });
        reactionRolesDb.run(`
            DELETE FROM reaction_roles 
            WHERE discord_message_id = ? AND emoji = ?
        `, [messageId, emoji], function(err) {
            if (err) {
                console.error('Database error:', err);
                reject(err);
            } else {
                console.log('Removed reaction role successfully');
                resolve(this.changes > 0);
            }
        });
    });
}






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

// Giveaway database functions
async function createGiveaway(data) {
    return new Promise((resolve, reject) => {
        giveawayDb.run(`
            INSERT INTO giveaways (
                guild_id, channel_id, message_id, prize, description,
                winner_count, host_id, end_time, requires_approval, approval_channel_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            data.guildId, data.channelId, data.messageId, data.prize,
            data.description, data.winnerCount, data.hostId, data.endTime,
            data.requiresApproval, data.approvalChannelId
        ], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

async function addGiveawayEntry(giveawayId, userId) {
    return new Promise((resolve, reject) => {
        giveawayDb.run(`
            INSERT OR IGNORE INTO giveaway_entries (giveaway_id, user_id, entry_time)
            VALUES (?, ?, ?)
        `, [giveawayId, userId, Date.now()], function(err) {
            if (err) reject(err);
            else resolve(this.changes > 0);
        });
    });
}

async function removeGiveawayEntry(giveawayId, userId) {
    return new Promise((resolve, reject) => {
        giveawayDb.run(`
            DELETE FROM giveaway_entries
            WHERE giveaway_id = ? AND user_id = ?
        `, [giveawayId, userId], function(err) {
            if (err) reject(err);
            else resolve(this.changes > 0);
        });
    });
}

async function getGiveaway(giveawayId) {
    return new Promise((resolve, reject) => {
        giveawayDb.get(`
            SELECT * FROM giveaways WHERE id = ?
        `, [giveawayId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}
async function getNextTicketNumber(guildId) {
    return new Promise((resolve, reject) => {
        ticketDb.serialize(() => {
            // Insert or ignore in case this is the first ticket
            ticketDb.run(
                'INSERT OR IGNORE INTO ticket_counters (guild_id, counter) VALUES (?, 0)',
                [guildId]
            );

            // Increment the counter and get the new value
            ticketDb.get(
                'UPDATE ticket_counters SET counter = counter + 1 WHERE guild_id = ? RETURNING counter',
                [guildId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row?.counter || 1);
                }
            );
        });
    });
}

async function getGiveawayEntries(giveawayId) {
    return new Promise((resolve, reject) => {
        giveawayDb.all(`
            SELECT * FROM giveaway_entries WHERE giveaway_id = ?
        `, [giveawayId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function updateGiveawayStatus(giveawayId, status) {
    return new Promise((resolve, reject) => {
        giveawayDb.run(`
            UPDATE giveaways SET status = ? WHERE id = ?
        `, [status, giveawayId], function(err) {
            if (err) reject(err);
            else resolve(this.changes > 0);
        });
    });
}

async function updateGiveawayMessage(giveawayId, messageId) {
    return new Promise((resolve, reject) => {
        giveawayDb.run(`
            UPDATE giveaways 
            SET message_id = ? 
            WHERE id = ?
        `, [messageId, giveawayId], function(err) {
            if (err) reject(err);
            else resolve(this.changes > 0);
        });
    });
}

async function selectWinners(giveawayId, count) {
    return new Promise(async (resolve, reject) => {
        try {
            const entries = await getGiveawayEntries(giveawayId);
            const winners = [];
            const entryPool = [...entries];

            while (winners.length < count && entryPool.length > 0) {
                const index = Math.floor(Math.random() * entryPool.length);
                winners.push(entryPool[index].user_id);
                entryPool.splice(index, 1);
            }

            resolve(winners);
        } catch (error) {
            reject(error);
        }
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
    isSuggestionChannel,
    createGiveaway,
    addGiveawayEntry,
    removeGiveawayEntry,
    getGiveaway,
    getGiveawayEntries,
    updateGiveawayStatus,
    updateGiveawayMessage,
    selectWinners,
    createReactionRoleMessage,
    addReactionRole,
    removeReactionRole,
    getReactionRoles,
    getReactionRoleMessage,
    getNextTicketNumber,
    // Reminders exports
    createReminder,
    getDueReminders,
    deleteReminder,
    getUserReminders
};
