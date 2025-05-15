module.exports = async (client, invite) => {
    try {
        const guildInvites = client.invites.get(invite.guild.id) || new Collection();
        guildInvites.set(invite.code, invite.uses);
        client.invites.set(invite.guild.id, guildInvites);
    } catch (err) {
        console.error('Error handling invite create:', err);
    }
};