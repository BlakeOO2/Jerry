// File: slashCommands/tickets/setlogschannel.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlogschannel')
        .setDescription('Set the channel for ticket logs')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel where ticket logs will be sent')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({
                content: 'You need Administrator permissions to use this command.',
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel('channel');
        
        // Validate channel type
        if (channel.type !== 0) { // 0 is text channel
            return interaction.reply({
                content: 'Please select a text channel!',
                ephemeral: true
            });
        }

        // Save the configuration
        const configPath = path.join(__dirname, '../../data/config.json');
        let config = {};

        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        config.logsChannelId = channel.id;

        // Ensure directory exists
        const dir = path.dirname(configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        await interaction.reply({
            content: `Successfully set ${channel} as the ticket logs channel!`,
            ephemeral: true
        });
    },
};
