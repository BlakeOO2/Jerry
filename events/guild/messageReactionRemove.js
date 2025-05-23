// events/guild/messageReactionRemove.js
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

        console.log('Reaction removed:', {
            messageId: reaction.message.id,
            emoji: reaction.emoji.name,
            userId: user.id
        });

        // Get the message ID
        const messageId = reaction.message.id;

        // Get the emoji identifier
        const emojiIdentifier = reaction.emoji.id || reaction.emoji.name;
        console.log('Emoji identifier:', emojiIdentifier);

        // Get roles for this message directly
        const reactionRoles = await getReactionRoles(messageId);
        console.log('Available roles:', reactionRoles);

        // Find matching role
        const roleData = reactionRoles.find(r => r.emoji === emojiIdentifier);
        console.log('Matching role data:', roleData);

        if (!roleData) {
            console.log('No matching role found');
            return;
        }

        // Remove the role
        const member = await reaction.message.guild.members.fetch(user.id);
        console.log('Removing role:', roleData.role_id);
        await member.roles.remove(roleData.role_id);
        console.log('Role removed successfully');

    } catch (error) {
        console.error('Error in messageReactionRemove:', error);
        console.error('Error details:', error.message);
    }
};
