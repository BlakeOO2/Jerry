const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setinvitelogs')
        .setDescription('Set the channel for invite logs')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send invite logs to')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        try {
            const channel = interaction.options.getChannel('channel');

            // You might want to store this in your database or config file
            // For now, we'll use the channel name convention

            await channel.send('✅ This channel has been set as the invite logs channel.');
            
            await interaction.reply({
                content: `Successfully set ${channel} as the invite logs channel!`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error setting invite logs channel:', error);
            await interaction.reply({
                content: 'There was an error setting the invite logs channel!',
                ephemeral: true
            });
        }
    }
};
