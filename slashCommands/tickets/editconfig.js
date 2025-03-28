// slashcommands/tickets/editconfig.js
const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('editticket')
        .setDescription('Edit an existing ticket configuration')
        .addStringOption(option =>
            option.setName('ticket_id')
                .setDescription('The ID of the ticket configuration to edit')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('setting')
                .setDescription('What setting to edit')
                .setRequired(true)
                .addChoices(
                    { name: 'Initial Message', value: 'initial_message' },
                    { name: 'Allowed Roles', value: 'allowed_roles' },
                    { name: 'Category', value: 'category_id' }
                ))
        .addStringOption(option =>
            option.setName('value')
                .setDescription('New value for the setting')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ 
                content: 'You need Administrator permissions to use this command.', 
                ephemeral: true 
            });
        }

        const ticketId = interaction.options.getString('ticket_id');
        const setting = interaction.options.getString('setting');
        const value = interaction.options.getString('value');

        const configPath = path.join(__dirname, '../../data/tickets', `${ticketId}.json`);

        if (!fs.existsSync(configPath)) {
            return interaction.reply({
                content: 'Ticket configuration not found!',
                ephemeral: true
            });
        }

        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            switch(setting) {
                case 'initial_message':
                    config.initial_message = value;
                    break;
                case 'allowed_roles':
                    config.allowed_roles = value.split(',').map(role => role.trim());
                    break;
                case 'category_id':
                    config.category_id = value;
                    break;
            }

            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Configuration Updated')
                .setDescription(`Successfully updated ${setting} for ticket configuration ${ticketId}`);

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'An error occurred while updating the configuration.',
                ephemeral: true
            });
        }
    }
};
