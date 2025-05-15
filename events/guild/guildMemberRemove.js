// events/guild/guildMemberRemove.js
const { updateInvites, getInviter } = require('../../handlers/database.js');

module.exports = async (client, member) => {
    try {
        const inviterId = await getInviter(member.id);
        if (!inviterId) return;

        const inviter = await client.users.fetch(inviterId);
        if (!inviter) return;

        await updateInvites(inviter.id, inviter.tag, 'left', 1);
        await updateInvites(inviter.id, inviter.tag, 'regular', -1);

        const logsChannel = member.guild.channels.cache.find(channel => 
            channel.name === 'invite-logs' || channel.name === 'logs'
        );

        if (logsChannel) {
            await logsChannel.send(
                `${member.user.tag} left the server. They were invited by ${inviter.tag}.`
            );
        }
    } catch (err) {
        console.error('Error handling member remove:', err);
    }
};
