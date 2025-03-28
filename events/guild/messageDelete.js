const { saveDeletedMessage } = require('../../handlers/database.js');

module.exports = async (client, message) => {
    try {
        console.log(`🛑 messageDelete event triggered!`);
        
        // Check if message is valid
        if (!message || !message.author || message.author.bot) {
            console.log('Message invalid or from bot, skipping');
            return;
        }

        const content = message.content;
        const image = message.attachments.size > 0 
            ? Array.from(message.attachments.values())[0].url 
            : null;

        console.log('Message to save:', {
            content,
            author: message.author.tag,
            channelId: message.channel.id,
            userId: message.author.id
        });

        if (!content && !image) {
            console.log('Message has no content or image. Skipping.');
            return;
        }

        // Save the deleted message
        await saveDeletedMessage(
            message.channel.id,
            message.author.id,
            message.author.username,
            content,
            image,
            Date.now()
        );

        console.log('✅ Message saved successfully');

    } catch (error) {
        console.error('❌ Error in messageDelete event:', error);
    }
};
