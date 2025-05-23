const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder
} = require('discord.js');
const {
    createGiveaway,
    getGiveaway,
    getGiveawayEntries,
    updateGiveawayStatus,
    updateGiveawayMessage
} = require('../../handlers/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage giveaways')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new giveaway')
                .addStringOption(option =>
                    option.setName('prize')
                        .setDescription('What are you giving away?')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Description of the giveaway')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('Number of winners')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10))
                .addStringOption(option =>
                    option.setName('duration')
                        .setDescription('Duration of the giveaway (e.g., 1m, 1h, 1d, 1w)')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('requires_approval')
                        .setDescription('Whether winners need approval'))
                .addChannelOption(option =>
                    option.setName('approval_channel')
                        .setDescription('Channel for winner approval messages')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End a giveaway early')
                .addIntegerOption(option =>
                    option.setName('giveaway_id')
                        .setDescription('ID of the giveaway to end')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reroll')
                .setDescription('Reroll winners for a giveaway')
                .addIntegerOption(option =>
                    option.setName('giveaway_id')
                        .setDescription('ID of the giveaway to reroll')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('winner_count')
                        .setDescription('Number of winners to reroll')
                        .setMinValue(1)
                        .setMaxValue(10))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'start': {
                const prize = interaction.options.getString('prize');
                const description = interaction.options.getString('description');
                const winnerCount = interaction.options.getInteger('winners');
                const duration = interaction.options.getString('duration');
                const requiresApproval = interaction.options.getBoolean('requires_approval') ?? false;
                const approvalChannel = interaction.options.getChannel('approval_channel');

                // Parse duration
                const durationMs = parseDuration(duration);
                if (!durationMs) {
                    return await interaction.reply({
                        content: 'Invalid duration format! Use format like 1m, 1h, 1d, 1w',
                        ephemeral: true
                    });
                }

                const endTime = Date.now() + durationMs;

                // Create embed
                const embed = new EmbedBuilder()
                    .setTitle('🎉 GIVEAWAY 🎉')
                    .setColor('#FF00FF')
                    .setDescription(`**${prize}**\n\n${description}`)
                    .addFields(
                        { name: '🎫 Entries', value: '0', inline: true },
                        { name: '👑 Winners', value: winnerCount.toString(), inline: true },
                        { name: '👤 Host', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '⏰ Ends', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true }
                    );

                // First, save giveaway to database
                const giveawayId = await createGiveaway({
                    guildId: interaction.guildId,
                    channelId: interaction.channelId,
                    messageId: null, // We'll update this after sending the message
                    prize,
                    description,
                    winnerCount,
                    hostId: interaction.user.id,
                    endTime,
                    requiresApproval,
                    approvalChannelId: approvalChannel?.id
                });

                // Then create button with the ID we got
                const button = new ButtonBuilder()
                    .setCustomId(`giveaway_enter_${giveawayId}`)
                    .setLabel('Enter Giveaway')
                    .setEmoji('🎟️')
                    .setStyle(ButtonStyle.Primary);

                const row = new ActionRowBuilder().addComponents(button);

                // Update embed with giveaway ID
                embed.setFooter({ text: `Giveaway ID: ${giveawayId}` });

                // Send giveaway message
                const message = await interaction.channel.send({
                    embeds: [embed],
                    components: [row]
                });

                // Update the message ID in the database
                await updateGiveawayMessage(giveawayId, message.id);

                await interaction.reply({
                    content: `Giveaway started! ID: ${giveawayId}`,
                    ephemeral: true
                });

                // Schedule giveaway end
                setTimeout(() => endGiveaway(giveawayId, false, interaction.client), durationMs);
                break;


            }

            case 'end': {
                const giveawayId = interaction.options.getInteger('giveaway_id');
                await endGiveaway(giveawayId, true, interaction.client);
                await interaction.reply({
                    content: `Giveaway ${giveawayId} has been ended.`,
                    ephemeral: true
                });
                break;
            }

            case 'reroll': {
                const giveawayId = interaction.options.getInteger('giveaway_id');
                const winnerCount = interaction.options.getInteger('winner_count');

                const giveaway = await getGiveaway(giveawayId);
                if (!giveaway) {
                    return await interaction.reply({
                        content: 'Giveaway not found!',
                        ephemeral: true
                    });
                }

                const winners = await selectWinners(giveawayId, winnerCount || giveaway.winner_count);
                const winnerMentions = winners.map(userId => `<@${userId}>`).join(', ');

                const channel = await interaction.guild.channels.fetch(giveaway.channel_id);
                await channel.send(`🎉 New winner${winners.length > 1 ? 's' : ''} for **${giveaway.prize}**: ${winnerMentions}!`);

                await interaction.reply({
                    content: `Rerolled winners for giveaway ${giveawayId}.`,
                    ephemeral: true
                });
                break;
            }
        }
    }
};

// Helper functions
function parseDuration(duration) {
    const match = duration.match(/^(\d+)([mhdw])$/);
    if (!match) return null;

    const [_, amount, unit] = match;
    const multiplier = {
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000,
        'w': 7 * 24 * 60 * 60 * 1000
    }[unit];

    return parseInt(amount) * multiplier;
}

async function selectWinners(giveawayId, count) {
    const entries = await getGiveawayEntries(giveawayId);
    const winners = [];
    const entryPool = [...entries];

    while (winners.length < count && entryPool.length > 0) {
        const index = Math.floor(Math.random() * entryPool.length);
        winners.push(entryPool[index].user_id);
        entryPool.splice(index, 1);
    }

    return winners;
}

async function endGiveaway(giveawayId, forced = false, client) {  // Add client parameter
    const giveaway = await getGiveaway(giveawayId);
    if (!giveaway || giveaway.status !== 'active') return;

    const winners = await selectWinners(giveawayId, giveaway.winner_count);
    await updateGiveawayStatus(giveawayId, 'ended');

    try {
        const channel = await client.channels.fetch(giveaway.channel_id);
        const message = await channel.messages.fetch(giveaway.message_id);

        const winnerMentions = winners.map(userId => `<@${userId}>`).join(', ');
        const endEmbed = EmbedBuilder.from(message.embeds[0])
            .setColor(winners.length > 0 ? '#00FF00' : '#FF0000')
            .setDescription(`**${giveaway.prize}**\n\n${giveaway.description}\n\n${winners.length > 0 ? `Winners: ${winnerMentions}` : 'No valid entries.'}`);

        await message.edit({
            embeds: [endEmbed],
            components: []
        });

        if (winners.length > 0) {
            if (giveaway.requires_approval && giveaway.approval_channel_id) {
                const approvalChannel = await client.channels.fetch(giveaway.approval_channel_id);
                const approvalEmbed = new EmbedBuilder()
                    .setTitle('Giveaway Winner Approval')
                    .setDescription(`Prize: ${giveaway.prize}\nWinners: ${winnerMentions}`)
                    .setColor('#FFA500');

                const approveButton = new ButtonBuilder()
                    .setCustomId(`giveaway_approve_${giveawayId}`)
                    .setLabel('Approve')
                    .setStyle(ButtonStyle.Success);

                const denyButton = new ButtonBuilder()
                    .setCustomId(`giveaway_deny_${giveawayId}`)
                    .setLabel('Deny')
                    .setStyle(ButtonStyle.Danger);

                const rerollButton = new ButtonBuilder()
                    .setCustomId(`giveaway_reroll_${giveawayId}`)
                    .setLabel('Reroll')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(approveButton, denyButton, rerollButton);

                await approvalChannel.send({
                    embeds: [approvalEmbed],
                    components: [row]
                });
            } else {
                await channel.send(`Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`);
            }
        }
    } catch (error) {
        console.error('Error ending giveaway:', error);
    }
}
