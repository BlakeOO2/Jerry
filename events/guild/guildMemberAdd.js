// events/guild/guildMemberAdd.js
const { updateInvites, trackInvite } = require('../../handlers/database.js');

module.exports = async (client, member) => {
    try {
        // First handle the role assignment (your existing code)
        // const roleId = "1353311577448644638";
        // const role = member.guild.roles.cache.get(roleId);
        // if (role) {
        //     await member.roles.add(role);
        // } Old nomad role, dont need this anymore but will leave in incase we add a new role on add

        // Then handle invite tracking
        const cachedInvites = client.invites.get(member.guild.id);
        const newInvites = await member.guild.invites.fetch();
        
        const usedInvite = newInvites.find(invite => {
            const cachedUses = cachedInvites.get(invite.code) || 0;
            return invite.uses > cachedUses;
        });

        // Update the cache with new invite counts
        client.invites.set(member.guild.id, new Collection(newInvites.map((invite) => [invite.code, invite.uses])));

        if (usedInvite && usedInvite.inviter) {
            await updateInvites(usedInvite.inviter.id, usedInvite.inviter.tag, 'regular', 1);
            await trackInvite(member.id, usedInvite.inviter.id);

            // Send log message if a logs channel exists
            const logsChannel = member.guild.channels.cache.find(channel => 
                channel.name === 'invite-logs' || channel.name === 'logs'
            );

            if (logsChannel) {
                await logsChannel.send(
                    `${member} joined using invite code ${usedInvite.code} from ${usedInvite.inviter.tag}`
                );
            }
        }
    } catch (err) {
        console.error('Error handling member add:', err);
    }
};
