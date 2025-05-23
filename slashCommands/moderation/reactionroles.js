const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const {
    createReactionRoleMessage,
    addReactionRole,
    removeReactionRole,
    getReactionRoles,
    getReactionRoleMessage
} = require('../../handlers/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reactionroles')
        .setDescription('Manage reaction roles')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new reaction role message')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Title of the embed')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Description of the embed')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a reaction role to a message')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID of the reaction role message')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Emoji to use')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to give')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a reaction role')
                .addStringOption(option =>  // Changed from addIntegerOption to addStringOption
                    option.setName('message_id')
                        .setDescription('ID of the reaction role message')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Emoji to remove')
                        .setRequired(true))),


    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create': {
                const title = interaction.options.getString('title');
                const description = interaction.options.getString('description');

                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(description)
                    .setColor('#0099ff');

                const message = await interaction.channel.send({ embeds: [embed] });

                const messageId = await createReactionRoleMessage(
                    interaction.guildId,
                    interaction.channelId,
                    message.id,
                    title,
                    description
                );

                embed.setFooter({ text: `Reaction Roles ID: ${messageId}` });
                await message.edit({ embeds: [embed] });

                await interaction.reply({
                    content: `Reaction role message created! ID: ${messageId}`,
                    ephemeral: true
                });
                break;
            }

            case 'add': {
                const messageId = interaction.options.getString('message_id');
                const emojiInput = interaction.options.getString('emoji');
                const role = interaction.options.getRole('role');

                try {
                    // Get all messages in channel
                    const messages = await interaction.channel.messages.fetch();

                    // Find message with matching footer ID
                    const message = messages.find(msg => {
                        if (!msg.embeds[0]?.footer?.text) return false;
                        const footerId = msg.embeds[0].footer.text.match(/ID: (\d+)/);
                        return footerId && parseInt(footerId[1]) === parseInt(messageId);
                    });

                    // Rest of your code...


                    if (!message) {
                        return await interaction.reply({
                            content: 'Message not found! Make sure you\'re using the ID from the embed footer.',
                            ephemeral: true
                        });
                    }

                    // Validate emoji
                    let emoji;
                    try {
                        if (emojiInput.match(/<a?:.+:\d+>/)) {
                            const emojiId = emojiInput.match(/\d+/)[0];
                            emoji = interaction.client.emojis.cache.get(emojiId);
                            if (!emoji) throw new Error('Custom emoji not found');
                        } else {
                            await message.react(emojiInput);
                            emoji = emojiInput;
                        }
                    } catch (error) {
                        return await interaction.reply({
                            content: 'Invalid emoji! Please use a standard emoji or a custom emoji from this server.',
                            ephemeral: true
                        });
                    }

                    // Add the reaction role to database using message.id
                    await addReactionRole(message.id, emoji.id || emoji, role.id);

                    // Update the embed
                    const embed = EmbedBuilder.from(message.embeds[0]);
                    const roles = await getReactionRoles(message.id);

                    let description = embed.data.description.split('\n\n**Available Roles:**\n')[0];
                    description += '\n\n**Available Roles:**\n';

                    for (const roleData of roles) {
                        const roleObj = await interaction.guild.roles.fetch(roleData.role_id);
                        const emojiDisplay = roleData.emoji.includes(':')
                            ? `<${roleData.emoji}>`
                            : roleData.emoji;
                        description += `${emojiDisplay} - <@&${roleObj.id}>\n`;
                    }

                    embed.setDescription(description);
                    await message.edit({ embeds: [embed] });

                    await interaction.reply({
                        content: `Added reaction role: ${emoji} -> ${role.name}`,
                        ephemeral: true
                    });

                } catch (error) {
                    console.error('Error adding reaction role:', error);
                    await interaction.reply({
                        content: 'There was an error adding the reaction role.',
                        ephemeral: true
                    });
                }
                break;
            }


            case 'remove': {
                const messageId = interaction.options.getString('message_id');
                const emojiInput = interaction.options.getString('emoji');

                try {
                    // Get all messages in channel
                    const messages = await interaction.channel.messages.fetch();

                    // Find message with matching footer ID
                    const message = messages.find(msg => {
                        if (!msg.embeds[0]?.footer?.text) return false;
                        const footerId = msg.embeds[0].footer.text.match(/ID: (\d+)/);
                        return footerId && parseInt(footerId[1]) === parseInt(messageId);
                    });

                    if (!message) {
                        return await interaction.reply({
                            content: 'Message not found! Make sure you\'re using the ID from the embed footer.',
                            ephemeral: true
                        });
                    }

                    // Get emoji identifier
                    let emoji;
                    if (emojiInput.match(/<a?:.+:\d+>/)) {
                        const emojiId = emojiInput.match(/\d+/)[0];
                        emoji = interaction.client.emojis.cache.get(emojiId);
                        if (!emoji) throw new Error('Custom emoji not found');
                        emoji = emoji.id;
                    } else {
                        emoji = emojiInput;
                    }

                    // Remove the reaction role from database
                    await removeReactionRole(message.id, emoji);

                    // Remove the reaction from the message
                    const reaction = message.reactions.cache.find(r =>
                        r.emoji.id === emoji || r.emoji.name === emoji
                    );
                    if (reaction) await reaction.remove();

                    // Update the embed
                    const embed = EmbedBuilder.from(message.embeds[0]);
                    const roles = await getReactionRoles(message.id);

                    let description = embed.data.description.split('\n\n**Available Roles:**\n')[0];
                    if (roles.length > 0) {
                        description += '\n\n**Available Roles:**\n';
                        for (const roleData of roles) {
                            const roleObj = await interaction.guild.roles.fetch(roleData.role_id);
                            const emojiDisplay = roleData.emoji.includes(':')
                                ? `<${roleData.emoji}>`
                                : roleData.emoji;
                            description += `${emojiDisplay} - <@&${roleObj.id}>\n`;
                        }
                    }

                    embed.setDescription(description);
                    await message.edit({ embeds: [embed] });

                    await interaction.reply({
                        content: `Removed reaction role for ${emojiInput}`,
                        ephemeral: true
                    });

                } catch (error) {
                    console.error('Error removing reaction role:', error);
                    await interaction.reply({
                        content: 'There was an error removing the reaction role.',
                        ephemeral: true
                    });
                }
                break;
            }

        }
    }
};
