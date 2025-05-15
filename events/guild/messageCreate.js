// events/guild/messageCreate.js
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { createSuggestion } = require('../../handlers/database.js');

module.exports = async (client, message) => {
    // Check if message is in a suggestion channel
    // You'll need to implement channel checking logic
    if (message.author.bot) return;

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
            .setStyle(ButtonStyle.Success);

        const threadButton = new ButtonBuilder()
            .setCustomId('suggestion_thread')
            .setEmoji('#️⃣')
            .setLabel('0')
            .setStyle(ButtonStyle.Primary);

        const downvoteButton = new ButtonBuilder()
            .setCustomId('suggestion_downvote')
            .setEmoji('👎')
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
