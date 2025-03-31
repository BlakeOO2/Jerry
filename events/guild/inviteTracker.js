const { Events } = require('discord.js');
const { updateInvites, trackInvite, getInviter } = require('../../handlers/database.js'); // Adjust path as needed

module.exports = async (client) => {
    // Cache for storing guild invites
    const guildInvites = new Map();

    // Load all guild invites into cache when bot starts
    client.on(Events.ClientReady, async () => {
        try {
            for (const guild of client.guilds.cache.values()) {
                const invites = await guild.invites.fetch();
                guildInvites.set(guild.id, new Map(invites.map(invite => [invite.code, invite.uses])));
            }
        } catch (error) {
            console.error('Error caching invites:', error);
        }
    });

    // Track member joins
    client.on(Events.GuildMemberAdd, async (member) => {
        try {
            const cachedInvites = guildInvites.get(member.guild.id);
            const newInvites = await member.guild.invites.fetch();
            const usedInvite = newInvites.find(invite => {
                const cachedUses = cachedInvites.get(invite.code) || 0;
                return invite.uses > cachedUses;
            });

            // Update the cache
            guildInvites.set(member.guild.id, new Map(newInvites.map(invite => [invite.code, invite.uses])));

            if (!usedInvite) return;

            const inviter = usedInvite.inviter;
            if (!inviter) return;

            // Update database
            await updateInvites(inviter.id, inviter.tag, 'regular', 1);
            await trackInvite(member.id, inviter.id);

            // Get updated invite count
            const inviterData = await getInvites(inviter.id);

            // Send log message if logs channel is set
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

    // Track member leaves
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
