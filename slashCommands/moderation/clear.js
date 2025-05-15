// slashCommands/moderation/clear.js
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear messages from channels')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (max 1000)')
                .setMinValue(1)
                .setMaxValue(1000)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('channel')
                .setDescription('Channel to clear messages from (type "all" for all channels)'))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Only delete messages from this user'))
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Delete messages from the last X time (e.g., 1h, 2d, 1w)')
                .addChoices(
                    { name: '1 hour', value: '1h' },
                    { name: '6 hours', value: '6h' },
                    { name: '12 hours', value: '12h' },
                    { name: '24 hours', value: '24h' },
                    { name: '2 days', value: '2d' },
                    { name: '7 days', value: '7d' }
                )),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const amount = interaction.options.getInteger('amount');
            const channelOption = interaction.options.getString('channel');
            const user = interaction.options.getUser('user');
            const timeOption = interaction.options.getString('time');

            // Calculate time limit if specified
            let timeLimit = null;
            if (timeOption) {
                const value = parseInt(timeOption.slice(0, -1));
                const unit = timeOption.slice(-1);
                const multiplier = {
                    'h': 60 * 60 * 1000,
                    'd': 24 * 60 * 60 * 1000,
                    'w': 7 * 24 * 60 * 60 * 1000
                }[unit];
                timeLimit = Date.now() - (value * multiplier);
            }

            // Function to filter messages based on criteria
            const filterMessages = (messages) => {
                return messages.filter(msg => {
                    if (user && msg.author.id !== user.id) return false;
                    if (timeLimit && msg.createdTimestamp < timeLimit) return false;
                    return true;
                });
            };

            // Function to clear messages from a single channel
            async function clearChannel(channel) {
                let channelTotal = 0;
                let remaining = amount;

                while (remaining > 0) {
                    const batchSize = Math.min(remaining, 100);
                    const messages = await channel.messages.fetch({ limit: batchSize });
                    const filteredMessages = filterMessages(messages);

                    if (filteredMessages.size === 0) break;

                    const deleted = await channel.bulkDelete(filteredMessages, true)
                        .catch(error => {
                            if (error.code === 50034) { // Message too old
                                return { size: 0 };
                            }
                            throw error;
                        });

                    channelTotal += deleted.size;
                    remaining -= batchSize;

                    if (deleted.size === 0) break;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                return channelTotal;
            }

            let totalDeleted = 0;
            let channelsCleared = 0;
            let failedChannels = 0;

            if (channelOption?.toLowerCase() === 'all') {
                // Get all text channels in the guild
                const channels = interaction.guild.channels.cache
                    .filter(ch => ch.type === ChannelType.GuildText && 
                                ch.permissionsFor(interaction.guild.members.me).has('ManageMessages'));

                // Progress update
                await interaction.editReply(`Starting to clear messages from ${channels.size} channels...`);

                // Clear each channel
                for (const [_, channel] of channels) {
                    try {
                        const channelDeleted = await clearChannel(channel);
                        if (channelDeleted > 0) {
                            totalDeleted += channelDeleted;
                            channelsCleared++;
                        }
                        // Update progress every 5 channels
                        if (channelsCleared % 5 === 0) {
                            await interaction.editReply(
                                `Progress: Cleared ${totalDeleted} messages from ${channelsCleared} channels...`
                            );
                        }
                    } catch (error) {
                        console.error(`Error clearing channel ${channel.name}:`, error);
                        failedChannels++;
                    }
                    // Wait between channels to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } else {
                // Clear single channel
                const channel = channelOption ? 
                    interaction.guild.channels.cache.get(channelOption.replace(/[<#>]/g, '')) : 
                    interaction.channel;

                if (!channel) {
                    return await interaction.editReply('Invalid channel specified.');
                }

                totalDeleted = await clearChannel(channel);
                channelsCleared = totalDeleted > 0 ? 1 : 0;
            }

            // Build response message
            let response = `Operation complete!\n`;
            response += `• Deleted ${totalDeleted} message${totalDeleted === 1 ? '' : 's'}\n`;
            if (channelOption?.toLowerCase() === 'all') {
                response += `• Cleared ${channelsCleared} channel${channelsCleared === 1 ? '' : 's'}\n`;
                if (failedChannels > 0) {
                    response += `• Failed to clear ${failedChannels} channel${failedChannels === 1 ? '' : 's'}\n`;
                }
            }
            if (user) {
                response += `• From user: ${user.tag}\n`;
            }
            if (timeOption) {
                response += `• Time range: Last ${timeOption}\n`;
            }

            await interaction.editReply({
                content: response,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error clearing messages:', error);
            await interaction.editReply({
                content: 'There was an error trying to clear messages.',
                ephemeral: true
            });
        }
    }
};
