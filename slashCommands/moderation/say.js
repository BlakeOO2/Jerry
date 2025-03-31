const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Blake } = require('../../ID/user.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Send a message through the bot')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to send')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send the message in (optional)')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('embed')
                .setDescription('Send the message in an embed?')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            // Convert both IDs to strings for comparison
            const userId = interaction.user.id;
            console.log('User ID:', userId); // Debug log
            console.log('Blake ID:', Blake);  // Debug log

            if (userId !== Blake) {
                await interaction.reply({
                    content: 'Only Blake can use this command!',
                    ephemeral: true
                });
                return;
            }

            const message = interaction.options.getString('message');
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            const useEmbed = interaction.options.getBoolean('embed') || false;

            if (useEmbed) {
                const embed = new EmbedBuilder()
                    .setDescription(message)
                    .setColor('#2f3136')
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
            } else {
                await channel.send(message);
            }

            await interaction.reply({
                content: `Message sent successfully in ${channel}!`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    ephemeral: true
                });
            }
        }
    }
};
