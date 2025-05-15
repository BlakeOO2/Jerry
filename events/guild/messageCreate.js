// events/guild/messageCreate.js
const { 
    createSuggestion, 
    isSuggestionChannel,
    updateThreadCount 
} = require('../../handlers/database.js');
const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = async (client, message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // If it's a thread message, update the counter
    if (message.channel.isThread()) {
        try {
            // Get the parent message (the suggestion embed)
            const parentMessage = await message.channel.fetchStarterMessage();
            if (!parentMessage?.embeds[0]?.footer?.text) return;

            // Get suggestion ID from footer
            const match = parentMessage.embeds[0].footer.text.match(/ID: (\d+)/);
            if (!match) return;

            const suggestionId = parseInt(match[1]);

            // Get thread message count (subtract 1 to exclude the initial message)
            const messageCount = (await message.channel.messages.fetch()).size - 1;

            // Update the button
            const row = ActionRowBuilder.from(parentMessage.components[0]);
            const threadButton = row.components[1]; // Middle button
            threadButton.setLabel(messageCount.toString());

            // Update the message
            await parentMessage.edit({
                embeds: [parentMessage.embeds[0]],
                components: [row]
            });

            // Update in database
            await updateThreadCount(suggestionId, messageCount);
        } catch (error) {
            console.error('Error updating thread message count:', error);
        }
        return; // Stop further processing if it's a thread message
    }

    // Check if it's a suggestion channel
    const isSuggestion = await isSuggestionChannel(message.guild.id, message.channel.id);
    if (!isSuggestion) return;

    try {
        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setAuthor({
                name: `${message.channel.name} | ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL()
            })
            .setDescription(message.content)
            .setTimestamp();

        // Create buttons
        const upvoteButton = new ButtonBuilder()
            .setCustomId('suggestion_upvote')
            .setEmoji('👍')
            .setLabel('0')
            .setStyle(ButtonStyle.Success);

        const threadButton = new ButtonBuilder()
            .setCustomId('suggestion_thread')
            .setEmoji('#️⃣')
            .setLabel('0')
            .setStyle(ButtonStyle.Primary);

        const downvoteButton = new ButtonBuilder()
            .setCustomId('suggestion_downvote')
            .setEmoji('👎')
            .setLabel('0')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder()
            .addComponents(upvoteButton, threadButton, downvoteButton);

        // Delete original message
        await message.delete();

        // Send embed with buttons
        const suggestionMsg = await message.channel.send({
            embeds: [embed],
            components: [row]
        });

        // Create thread
        const thread = await suggestionMsg.startThread({
            name: `Suggestion Discussion`,
            autoArchiveDuration: 60
        });

        // Save to database
        const suggestionId = await createSuggestion(
            message.guild.id,
            message.channel.id,
            suggestionMsg.id,
            message.author.id,
            message.content
        );

        // Update embed with ID
        embed.setFooter({ text: `(ID: ${suggestionId})` });
        await suggestionMsg.edit({ embeds: [embed] });

    } catch (error) {
        console.error('Error creating suggestion:', error);
    }
};
