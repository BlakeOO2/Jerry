// events/guild/guildCreate.js
module.exports = async (client, guild) => {
    try {
        const firstInvites = await guild.invites.fetch();
        client.invites.set(guild.id, new Collection(firstInvites.map((invite) => [invite.code, invite.uses])));
    } catch (err) {
        console.error(`Error caching invites for new guild ${guild.id}:`, err);
    }
};
