const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createReminder } = require('../../handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remind')
        .setDescription('Set a reminder for yourself')
        .addStringOption(option =>
            option.setName('time')
                .setDescription('The time to remind you (e.g., "10m", "1d", "2h")')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to remind you of')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('destination')
                .setDescription('Where to send the reminder: dm, channel, or both (default: both)')
                .addChoices(
                    { name: 'DM', value: 'dm' },
                    { name: 'Channel', value: 'channel' },
                    { name: 'Both', value: 'both' }
                )
                .setRequired(false)),

    async execute(interaction) {
        // Get options
        const timeStr = interaction.options.getString('time');
        const message = interaction.options.getString('message');
        const user = interaction.user;
        const destination = interaction.options.getString('destination') || 'both';

        // Parse time string to ms
        function parseTime(str) {
            const match = str.match(/(\d+)([smhd])/i);
            if (!match) return null;
            const num = parseInt(match[1]);
            const unit = match[2].toLowerCase();
            switch (unit) {
                case 's': return num * 1000;
                case 'm': return num * 60 * 1000;
                case 'h': return num * 60 * 60 * 1000;
                case 'd': return num * 24 * 60 * 60 * 1000;
                default: return null;
            }
        }
        const ms = parseTime(timeStr);
        if (!ms || ms < 1000) {
            return interaction.reply({ content: 'Invalid time format! Use s, m, h, or d (e.g., "10m", "1d").', ephemeral: false });
        }
        const remindAt = Date.now() + ms;

        // Save to DB
        await createReminder(user.id, message, remindAt, interaction.channelId);

        // Set timeout (in-memory, not persistent)
        setTimeout(async () => {
            // Always try both if destination is 'both'
            if (destination === 'dm' || destination === 'both') {
                try {
                    await user.send(`⏰ Reminder: ${message}`);
                } catch (e) { /* ignore DM errors */ }
            }
            if (destination === 'channel' || destination === 'both') {
                try {
                    // Use interaction.channel for reliability
                    const channel = interaction.channel || await interaction.client.channels.fetch(interaction.channelId);
                    if (channel && channel.send) channel.send(`<@${user.id}> ⏰ Reminder: ${message}`);
                } catch (e) { /* ignore channel errors */ }
            }
        }, ms);

        await interaction.reply({ content: `I will remind you in ${timeStr}: "${message}"`, ephemeral: false });
    }
};
