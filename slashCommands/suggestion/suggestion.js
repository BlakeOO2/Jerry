// slashcommands/suggestions/suggestion.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { updateSuggestionStatus, getSuggestion } = require('../../handlers/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggestion')
        .setDescription('Manage suggestions')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Enable suggestions in this channel'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('accept')
                .setDescription('Accept a suggestion')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('The suggestion ID')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for accepting')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('deny')
                .setDescription('Deny a suggestion')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('The suggestion ID')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for denying'))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'start': {
                // Store channel ID in database or config
                await interaction.reply({
                    content: 'Suggestions are now enabled in this channel!',
                    ephemeral: true
                });
                break;
            }

            case 'accept':
            case 'deny': {
                const id = interaction.options.getInteger('id');
                const reason = interaction.options.getString('reason');
                const status = subcommand === 'accept' ? 'accepted' : 'denied';

                try {
                    const suggestion = await getSuggestion(id);
                    if (!suggestion) {
                        return interaction.reply({
                            content: 'Suggestion not found!',
                            ephemeral: true
                        });
                    }

                    const message = await interaction.channel.messages.fetch(suggestion.messageId);
                    if (!message) {
                        return interaction.reply({
                            content: 'Suggestion message not found!',
                            ephemeral: true
                        });
                    }

                    const embed = message.embeds[0];
                    const newEmbed = EmbedBuilder.from(embed)
                        .setColor(status === 'accepted' ? '#00ff00' : '#ff0000');

                    if (reason) {
                        newEmbed.addFields({
                            name: `${status.charAt(0).toUpperCase() + status.slice(1)} by ${interaction.user.tag}`,
                            value: reason
                        });
                    }

                    await message.edit({ embeds: [newEmbed] });
                    await updateSuggestionStatus(id, status, interaction.user.id, reason);

                    await interaction.reply({
                        content: `Suggestion #${id} has been ${status}!`,
                        ephemeral: true
                    });
                } catch (error) {
                    console.error(error);
                    await interaction.reply({
                        content: 'There was an error processing the suggestion.',
                        ephemeral: true
                    });
                }
                break;
            }
        }
    }
};
