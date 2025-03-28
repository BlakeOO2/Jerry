const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits  } = require('discord.js');
const database = require('../../handlers/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('Retrieves recently deleted messages from this channel.')
        .addIntegerOption(option =>
            option.setName('number')
                .setDescription('Which message to show (1 = latest, 2 = second latest, etc.)')
                .setMinValue(1)
                .setMaxValue(50)
        )
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Show deleted messages from a specific user')
        )
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('How many messages to show (default: 1)')
                .setMinValue(1)
                .setMaxValue(50)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        try {
            const channelId = interaction.channel.id;
            const number = interaction.options.getInteger('number') || 1;
            const user = interaction.options.getUser('user');
            const count = interaction.options.getInteger('count') || 1;

            console.log('Searching for messages with:', {
                channelId,
                userId: user?.id,
                number,
                count
            });

            const messages = await database.getDeletedMessages(
                channelId,
                user?.id,
                count,
                number - 1
            );

            if (!messages || messages.length === 0) {
                return interaction.reply({
                    content: 'No deleted messages found.',
                    ephemeral: true
                });
            }

            // Create embeds for all messages
            const embeds = messages.map(deletedMessage => {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setAuthor({
                        name: deletedMessage.username,
                        iconURL: `https://cdn.discordapp.com/avatars/${deletedMessage.userId}/${interaction.client.users.cache.get(deletedMessage.userId)?.avatar}.png`
                    })
                    .setDescription(deletedMessage.message || '*[No Text Content]*')
                    .setFooter({ text: `Sniped by ${interaction.user.tag}` })
                    .setTimestamp(new Date(parseInt(deletedMessage.timestamp)));

                if (deletedMessage.image) {
                    embed.setImage(deletedMessage.image);
                }

                return embed;
            });

            await interaction.reply({ 
                embeds: embeds,
                content: messages.length > 1 ? `Found ${messages.length} deleted messages:` : null
            });

        } catch (error) {
            console.error('Error in snipe command:', error);
            await interaction.reply({
                content: 'An error occurred while fetching the deleted messages.',
                ephemeral: true
            });
        }
    }
};
