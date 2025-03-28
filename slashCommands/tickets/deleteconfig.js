const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deleteticket')
        .setDescription('Delete a ticket configuration')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('The ID of the ticket configuration to delete')
                .setRequired(true)),

    async execute(interaction) {
        const ticketId = interaction.options.getString('id');
        const ticketPath = path.join(__dirname, '../../data/tickets', `${ticketId}.json`);

        if (!fs.existsSync(ticketPath)) {
            return interaction.reply({
                content: 'No ticket configuration found with that ID!',
                ephemeral: true
            });
        }

        const confirmButton = new ButtonBuilder()
            .setCustomId(`confirm_delete_${ticketId}`)
            .setLabel('Confirm Delete')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId(`cancel_delete_${ticketId}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder()
            .addComponents(confirmButton, cancelButton);

        const response = await interaction.reply({
            content: `Are you sure you want to delete the ticket configuration with ID: ${ticketId}?`,
            components: [row],
            ephemeral: true
        });

        // Create button collector
        const collector = response.createMessageComponentCollector({ time: 15000 }); // 15 seconds timeout

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'You cannot use these buttons!', ephemeral: true });
            }

            if (i.customId === `confirm_delete_${ticketId}`) {
                try {
                    fs.unlinkSync(ticketPath);
                    await i.update({
                        content: `Successfully deleted ticket configuration with ID: ${ticketId}`,
                        components: [],
                        ephemeral: true
                    });
                } catch (error) {
                    console.error('Error deleting ticket configuration:', error);
                    await i.update({
                        content: 'There was an error deleting the ticket configuration!',
                        components: [],
                        ephemeral: true
                    });
                }
            } else if (i.customId === `cancel_delete_${ticketId}`) {
                await i.update({
                    content: 'Deletion cancelled.',
                    components: [],
                    ephemeral: true
                });
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                await interaction.editReply({
                    content: 'Deletion cancelled - timed out.',
                    components: [],
                    ephemeral: true
                });
            }
        });
    },
};
