// events/guild/messageReactionAdd.js
const { getReactionRoleMessage, getReactionRoles } = require('../../handlers/database.js');

module.exports = async (client, reaction, user) => {
    if (user.bot) return;

    try {
        // If the message was cached, no need to fetch it
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Error fetching reaction:', error);
                return;
            }
        }

        // Get the message
        const message = reaction.message;
        
        // Get the emoji identifier
        const emojiIdentifier = reaction.emoji.id || reaction.emoji.name;
        console.log('Emoji used:', emojiIdentifier);

        // Get roles for this message
        const roles = await getReactionRoles(message.id);
        console.log('Available roles:', roles);

        // Find matching role
        const roleData = roles.find(r => r.emoji === emojiIdentifier);
        console.log('Matching role:', roleData);

        if (!roleData) {
            console.log('No matching role found');
            return;
        }

        // Add the role
        const member = await reaction.message.guild.members.fetch(user.id);
        await member.roles.add(roleData.role_id);
        console.log(`Added role ${roleData.role_id} to user ${user.id}`);

    } catch (error) {
        console.error('Error in messageReactionAdd:', error);
    }
};
