const { Events } = require('discord.js');
const { updateInvites, trackInvite, getInviter } = require('../../handlers/database.js'); // Adjust path as needed
 


module.exports = async (client) => {
    // Cache for storing guild invites
    const guildInvites = new Map();

    // Function to cache invites for a guild
    const cacheInvites = async (guild) => {
        try {
            const firstInvites = await guild.invites.fetch();
            const inviteCache = new Map();
            
            firstInvites.each(invite => {
                console.log(`Caching invite ${invite.code} with ${invite.uses} uses`);
                inviteCache.set(invite.code, {
                    uses: invite.uses,
                    inviter: invite.inviter?.id,
                    code: invite.code
                });
            });
            
            guildInvites.set(guild.id, inviteCache);
        } catch (err) {
            console.error(`Error caching invites for guild ${guild.id}:`, err);
        }
    };

    // When bot becomes ready
    client.on(Events.ClientReady, async () => {
        console.log('Caching invites for all guilds...');
        for (const guild of client.guilds.cache.values()) {
            await cacheInvites(guild);
        }
        console.log('Finished caching invites');
    });

    // When bot joins a new guild
    client.on(Events.GuildCreate, async (guild) => {
        await cacheInvites(guild);
    });

    // When a new invite is created
    client.on(Events.InviteCreate, async (invite) => {
        const inviteCache = guildInvites.get(invite.guild.id) || new Map();
        inviteCache.set(invite.code, {
            uses: invite.uses,
            inviter: invite.inviter?.id,
            code: invite.code
        });
        guildInvites.set(invite.guild.id, inviteCache);
    });

    // When an invite is deleted
    client.on(Events.InviteDelete, async (invite) => {
        const inviteCache = guildInvites.get(invite.guild.id);
        if (inviteCache) {
            inviteCache.delete(invite.code);
        }
    });

    // Track member joins
    client.on(Events.GuildMemberAdd, async (member) => {
        try {
            const cachedInvites = guildInvites.get(member.guild.id);
            const newInvites = await member.guild.invites.fetch();
            
            // Find the used invite
            let usedInvite = null;
            let usedInviteCode = null;

            newInvites.each(invite => {
                const cachedInvite = cachedInvites.get(invite.code);
                if (!cachedInvite) {
                    // If we don't have the invite cached, it's a new one
                    if (invite.uses === 1) {
                        usedInvite = invite;
                        usedInviteCode = invite.code;
                    }
                } else if (invite.uses > cachedInvite.uses) {
                    usedInvite = invite;
                    usedInviteCode = invite.code;
                }
            });

            // Update the cache with new invite counts
            newInvites.each(invite => {
                cachedInvites.set(invite.code, {
                    uses: invite.uses,
                    inviter: invite.inviter?.id,
                    code: invite.code
                });
            });

            if (!usedInvite) {
                console.log(`Could not find invite used for ${member.user.tag}`);
                return;
            }

            const inviter = usedInvite.inviter;
            if (!inviter) return;

            console.log(`${member.user.tag} joined using invite code ${usedInviteCode} from ${inviter.tag}`);

            // Update database
            await updateInvites(inviter.id, inviter.tag, 'regular', 1);
            await trackInvite(member.id, inviter.id);

            // Get updated invite count
            const inviterData = await getInvites(inviter.id);

            // Send log message
            const logsChannel = member.guild.channels.cache.find(channel => 
                channel.name === 'invite-logs' || channel.name === 'logs'
            );

            if (logsChannel) {
                await logsChannel.send(
                    `${member} has been invited by ${inviter} and has now ${inviterData.totalInvites} invites.`
                );
            }

        } catch (error) {
            console.error('Error tracking invite:', error);
        }
    });

    client.on(Events.GuildMemberRemove, async (member) => {
        try {
            const inviterId = await getInviter(member.id);
            if (!inviterId) return;

            const inviter = await client.users.fetch(inviterId);
            if (!inviter) return;

            // Update left invites count
            await updateInvites(inviter.id, inviter.tag, 'left', 1);
            await updateInvites(inviter.id, inviter.tag, 'regular', -1);

            // Send log message
            const logsChannel = member.guild.channels.cache.find(channel => 
                channel.name === 'invite-logs' || channel.name === 'logs'
            );

            if (logsChannel) {
                await logsChannel.send(
                    `${member.user.tag} left the server, they were invited by ${inviter.tag}.`
                );
            }

        } catch (error) {
            console.error('Error tracking leave:', error);
        }
    });
};


    // Track member leaves
   