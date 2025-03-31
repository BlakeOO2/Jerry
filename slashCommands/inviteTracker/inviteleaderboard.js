const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ComponentType
} = require('discord.js');
const { getLeaderboard } = require('../../handlers/database.js'); // Adjust path as needed

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inviteleaderboard')
        .setDescription('View the server\'s invite leaderboard')
        .addBooleanOption(option =>
            option.setName('ephemeral')
                .setDescription('Make the response visible only to you')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const ephemeral = interaction.options.getBoolean('ephemeral') ?? false;
            let currentPage = 1;
            const itemsPerPage = 10;

            // Function to generate leaderboard embed
            async function generateLeaderboardEmbed(page) {
                const leaderboardData = await getLeaderboard(page, itemsPerPage);
                const totalUsers = await interaction.guild.memberCount; // You might want to get actual count of users with invites
                const maxPages = Math.ceil(totalUsers / itemsPerPage);

                const embed = new EmbedBuilder()
                    .setColor('#2f3136')
                    .setTitle('🏆 Invite Leaderboard')
                    .setDescription(
                        leaderboardData.length > 0 
                            ? leaderboardData.map((data, index) => {
                                const position = (page - 1) * itemsPerPage + index + 1;
                                return `${position}. <@${data.userId}> • ${data.totalInvites} invites. (${data.regularInvites} regular, ${data.leftInvites} left, ${data.fakeInvites} fake, ${data.bonusInvites} bonus)`;
                              }).join('\n')
                            : 'No invite data found.'
                    )
                    .setFooter({ text: `Page ${page} of ${maxPages} | Total Members: ${totalUsers}` })
                    .setTimestamp();

                return { embed, maxPages };
            }

            // Create navigation buttons
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('first')
                    .setLabel('⏪ First')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('last')
                    .setLabel('Last ⏭️')
                    .setStyle(ButtonStyle.Primary)
            );

            // Send initial embed
            const { embed, maxPages } = await generateLeaderboardEmbed(currentPage);
            const reply = await interaction.reply({
                embeds: [embed],
                components: maxPages > 1 ? [buttons] : [],
                ephemeral: ephemeral,
                fetchReply: true
            });

            if (maxPages <= 1) return;

            // Create button collector
            const collector = reply.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300000 // 5 minutes
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) {
                    await i.reply({
                        content: 'You cannot use these buttons!',
                        ephemeral: true
                    });
                    return;
                }

                // Update current page based on button pressed
                switch (i.customId) {
                    case 'first':
                        currentPage = 1;
                        break;
                    case 'previous':
                        currentPage = Math.max(1, currentPage - 1);
                        break;
                    case 'next':
                        currentPage = Math.min(maxPages, currentPage + 1);
                        break;
                    case 'last':
                        currentPage = maxPages;
                        break;
                }

                // Generate new embed for the new page
                const { embed: newEmbed } = await generateLeaderboardEmbed(currentPage);

                // Update buttons' disabled state
                buttons.components.forEach(button => {
                    if (button.data.custom_id === 'first' || button.data.custom_id === 'previous') {
                        button.setDisabled(currentPage === 1);
                    } else if (button.data.custom_id === 'next' || button.data.custom_id === 'last') {
                        button.setDisabled(currentPage === maxPages);
                    }
                });

                // Update the message
                await i.update({
                    embeds: [newEmbed],
                    components: [buttons]
                });
            });

            collector.on('end', () => {
                // Disable all buttons when collector expires
                buttons.components.forEach(button => button.setDisabled(true));
                reply.edit({ components: [buttons] }).catch(console.error);
            });

        } catch (error) {
            console.error('Error in inviteleaderboard command:', error);
            await interaction.reply({
                content: 'There was an error while fetching the leaderboard!',
                ephemeral: true
            });
        }
    }
};
