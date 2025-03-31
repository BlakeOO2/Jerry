const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { updateInvites, getInvites } = require('../../handlers/database.js'); // Adjust path as needed

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manageinvites')
        .setDescription('Manage user invites')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add invites to a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to add invites to')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of invites to add')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Regular', value: 'regular' },
                            { name: 'Bonus', value: 'bonus' },
                            { name: 'Fake', value: 'fake' }
                        ))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount of invites to add')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove invites from a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to remove invites from')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of invites to remove')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Regular', value: 'regular' },
                            { name: 'Left', value: 'left' },
                            { name: 'Fake', value: 'fake' },
                            { name: 'Bonus', value: 'bonus' }
                        ))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount of invites to remove')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset all invites for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to reset invites for')
                        .setRequired(true))),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const user = interaction.options.getUser('user');
            
            // Get current invite data
            let inviteData = await getInvites(user.id);

            switch (subcommand) {
                case 'add': {
                    const type = interaction.options.getString('type');
                    const amount = interaction.options.getInteger('amount');

                    await updateInvites(user.id, user.tag, type, amount);
                    inviteData = await getInvites(user.id);

                    const embed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('✅ Invites Added')
                        .setDescription(`Added ${amount} ${type} invites to ${user.tag}`)
                        .addFields(
                            { name: 'New Total Invites', value: `${inviteData.totalInvites}`, inline: false },
                            { name: 'Regular', value: `${inviteData.regularInvites}`, inline: true },
                            { name: 'Left', value: `${inviteData.leftInvites}`, inline: true },
                            { name: 'Fake', value: `${inviteData.fakeInvites}`, inline: true },
                            { name: 'Bonus', value: `${inviteData.bonusInvites}`, inline: true }
                        )
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] });
                    break;
                }

                case 'remove': {
                    const type = interaction.options.getString('type');
                    const amount = interaction.options.getInteger('amount');

                    // Check if there are enough invites to remove
                    if (inviteData[`${type}Invites`] < amount) {
                        await interaction.reply({
                            content: `Error: ${user.tag} only has ${inviteData[`${type}Invites`]} ${type} invites.`,
                            ephemeral: true
                        });
                        return;
                    }

                    await updateInvites(user.id, user.tag, type, -amount);
                    inviteData = await getInvites(user.id);

                    const embed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('✅ Invites Removed')
                        .setDescription(`Removed ${amount} ${type} invites from ${user.tag}`)
                        .addFields(
                            { name: 'New Total Invites', value: `${inviteData.totalInvites}`, inline: false },
                            { name: 'Regular', value: `${inviteData.regularInvites}`, inline: true },
                            { name: 'Left', value: `${inviteData.leftInvites}`, inline: true },
                            { name: 'Fake', value: `${inviteData.fakeInvites}`, inline: true },
                            { name: 'Bonus', value: `${inviteData.bonusInvites}`, inline: true }
                        )
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] });
                    break;
                }

                case 'reset': {
                    // Add a new function in database.js to handle this
                    await resetInvites(user.id);
                    
                    const embed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('🔄 Invites Reset')
                        .setDescription(`All invites have been reset for ${user.tag}`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] });
                    break;
                }
            }

        } catch (error) {
            console.error('Error in manageinvites command:', error);
            await interaction.reply({
                content: 'There was an error while managing invites!',
                ephemeral: true
            });
        }
    }
};
