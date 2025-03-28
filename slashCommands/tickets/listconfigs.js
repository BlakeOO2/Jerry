// slashcommands/tickets/listconfigs.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listtickets')
        .setDescription('List all ticket configurations'),

    async execute(interaction) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ 
                content: 'You need Administrator permissions to use this command.', 
                ephemeral: true 
            });
        }

        const configPath = path.join(__dirname, '../../data/tickets');
        
        if (!fs.existsSync(configPath)) {
            fs.mkdirSync(configPath, { recursive: true });
        }

        const files = fs.readdirSync(configPath).filter(file => file.endsWith('.json'));
        
        if (files.length === 0) {
            return interaction.reply({
                content: 'No ticket configurations found.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Ticket Configurations')
            .setDescription('List of all ticket configurations:');

        for (const file of files) {
            const config = JSON.parse(fs.readFileSync(path.join(configPath, file), 'utf8'));
            embed.addFields({
                name: `ID: ${file.replace('.json', '')}`,
                value: `Type: ${config.type}\nName: ${config.name}\nRoles: ${config.allowed_roles.length}`
            });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
