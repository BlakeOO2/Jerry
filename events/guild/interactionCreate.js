// File: events/guild/interactionCreate.js
const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    Collection
} = require('discord.js');
const { 
    toggleVote, 
    getVoteCounts, 
    updateThreadCount,
    getGiveaway,
    addGiveawayEntry,
    getGiveawayEntries,
    updateGiveawayStatus,
    selectWinners,
    updateGiveawayMessage,
    getNextTicketNumber
} = require('../../handlers/database.js');
const fs = require('fs');
const path = require('path');
const discordTranscripts = require('discord-html-transcripts');

// Add this right after your require statements
// Create necessary directories if they don't exist
const ticketsDir = path.join(__dirname, '../../data/tickets');
const transcriptsDir = path.join(__dirname, '../../data/transcripts');
const configDir = path.join(__dirname, '../../data');

// Create directories if they don't exist
[ticketsDir, transcriptsDir, configDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Create default config.json if it doesn't exist
const configPath = path.join(configDir, 'config.json');
if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({
        logsChannelId: null
    }, null, 2));
}

// Helper function to safely read JSON files
function safelyReadJson(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        return null;
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return null;
    }
}


// Store temporary application responses
const applicationResponses = new Map();

module.exports = async (client, interaction) => {
    try {
        // Handle Slash Commands
        if (interaction.isChatInputCommand()) {
            const command = client.slashCommands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('Slash Command Error:', error);
                try {
                    const reply = {
                        content: 'There was an error while executing this command!',
                        ephemeral: true
                    };

                    if (interaction.deferred || interaction.replied) {
                        await interaction.followUp(reply);
                    } else {
                        await interaction.reply(reply);
                    }
                } catch (err) {
                    console.error('Error handling command error:', err);
                }
            }
        }


        // Handle Button Interactions
        if (interaction.isButton()) {
            const customId = interaction.customId;

            // Add this to your existing button handling in interactionCreate.js
        if (customId.startsWith('giveaway_')) {
    const parts = customId.split('_');
    const action = parts[1];
    const giveawayId = parts[2]; // This will now correctly get the giveaway ID

    switch (action) {
        case 'enter': {
            try {
                // Add console.log for debugging
                console.log('Attempting to enter giveaway:', giveawayId);
                
                const giveaway = await getGiveaway(parseInt(giveawayId));
                console.log('Found giveaway:', giveaway);

                if (!giveaway || giveaway.status !== 'active') {
                    await interaction.reply({
                        content: 'This giveaway has ended!',
                        ephemeral: true
                    });
                    return;
                        }

                        const success = await addGiveawayEntry(giveawayId, interaction.user.id);
                        if (success) {
                            // Update entry count in embed
                            const entries = await getGiveawayEntries(giveawayId);
                            const embed = EmbedBuilder.from(interaction.message.embeds[0]);
                            embed.data.fields[0].value = entries.length.toString();

                            await interaction.message.edit({ embeds: [embed] });

                            await interaction.reply({
                                content: 'You have entered the giveaway! Good luck! 🍀',
                                ephemeral: true
                            });
                        } else {
                            await interaction.reply({
                                content: 'You have already entered this giveaway!',
                                ephemeral: true
                            });
                        }
                    } catch (error) {
                        console.error('Error handling giveaway entry:', error);
                        await interaction.reply({
                            content: 'There was an error entering the giveaway.',
                            ephemeral: true
                        });
                    }
                    break;
                }

                case 'approve': {
                    if (!interaction.member.permissions.has('ManageGuild')) {
                        await interaction.reply({
                            content: 'You do not have permission to approve winners!',
                            ephemeral: true
                        });
                        return;
                    }

                    const giveaway = await getGiveaway(parseInt(giveawayId));
                    if (!giveaway) {
                        await interaction.reply({
                            content: 'Giveaway not found!',
                            ephemeral: true
                        });
                        return;
                    }

                    const channel = await interaction.guild.channels.fetch(giveaway.channel_id);
                    const entries = await getGiveawayEntries(giveawayId);
                    const winners = entries.filter(entry => entry.status === 'pending')
                        .map(entry => `<@${entry.user_id}>`);

                    await channel.send(`🎉 Congratulations ${winners.join(', ')}! You won **${giveaway.prize}**!`);

                    // Disable buttons
                    const row = ActionRowBuilder.from(interaction.message.components[0]);
                    row.components.forEach(button => button.setDisabled(true));

                    await interaction.message.edit({ components: [row] });
                    await interaction.reply({
                        content: 'Winners have been approved and notified!',
                        ephemeral: true
                    });
                    break;
                }

                case 'deny': {
                    if (!interaction.member.permissions.has('ManageGuild')) {
                        await interaction.reply({
                            content: 'You do not have permission to deny winners!',
                            ephemeral: true
                        });
                        return;
                    }

                    // Update database to mark entries as denied
                    await updateGiveawayStatus(parseInt(giveawayId), 'denied');

                    // Disable buttons
                    const row = ActionRowBuilder.from(interaction.message.components[0]);
                    row.components.forEach(button => button.setDisabled(true));

                    await interaction.message.edit({ components: [row] });
                    await interaction.reply({
                        content: 'Winners have been denied. Use /giveaway reroll to select new winners.',
                        ephemeral: true
                    });
                    break;
                }

                case 'reroll': {
                    if (!interaction.member.permissions.has('ManageGuild')) {
                        await interaction.reply({
                            content: 'You do not have permission to reroll winners!',
                            ephemeral: true
                        });
                        return;
                    }

                    const giveaway = await getGiveaway(parseInt(giveawayId));
                    if (!giveaway) {
                        await interaction.reply({
                            content: 'Giveaway not found!',
                            ephemeral: true
                        });
                        return;
                    }

                    const winners = await selectWinners(giveawayId, giveaway.winner_count);
                    const winnerMentions = winners.map(userId => `<@${userId}>`).join(', ');

                    const channel = await interaction.guild.channels.fetch(giveaway.channel_id);
                    await channel.send(`🎉 New winner${winners.length > 1 ? 's' : ''} for **${giveaway.prize}**: ${winnerMentions}!`);

                    // Disable buttons
                    const row = ActionRowBuilder.from(interaction.message.components[0]);
                    row.components.forEach(button => button.setDisabled(true));

                    await interaction.message.edit({ components: [row] });
                    await interaction.reply({
                        content: 'Winners have been rerolled and notified!',
                        ephemeral: true
                    });
                    break;
                }
            }
        }

            // Add this new condition
            if (customId.startsWith('continue_application_')) {
                const parts = customId.split('_');
                const ticketId = parts[2];
                const page = parseInt(parts[3]);
                const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/tickets', `${ticketId}.json`), 'utf8'));
                const userResponses = applicationResponses.get(interaction.user.id) || [];
                await showApplicationForm(interaction, config, page, userResponses.length);
            }
            // Handle ticket creation buttons
            if (customId.startsWith('create_ticket_')) {
                try {
                    const ticketId = customId.split('_').slice(2).join('_'); // This will get the full ID including application_id
                    const configPath = path.join(__dirname, '../../data/tickets', `${ticketId}.json`);

                    // Use safelyReadJson instead of direct file reading
                    const config = safelyReadJson(configPath);

                    if (!config) {
                        return interaction.reply({
                            content: `Ticket configuration not found! Please create a ticket configuration first using "/createticket id:${ticketId}"`,
                            ephemeral: true
                        });
                    }

                    if (!config.category_id) {
                        return interaction.reply({
                            content: 'Invalid ticket configuration! Category ID is missing.',
                            ephemeral: true
                        });
                    }

                    if (!config.allowed_roles || !Array.isArray(config.allowed_roles)) {
                        return interaction.reply({
                            content: 'Invalid ticket configuration! Allowed roles are not properly configured.',
                            ephemeral: true
                        });
                    }

                    if (config.type === 'normal') {
                        await handleNormalTicket(interaction, config);
                    } else if (config.type === 'application') {
                        await handleApplicationTicket(interaction, config);
                    } else {
                        await interaction.reply({
                            content: 'Invalid ticket type configuration!',
                            ephemeral: true
                        });
                    }
                } catch (error) {
                    console.error('Ticket Creation Error:', error);
                    await interaction.reply({
                        content: 'There was an error creating the ticket! Please ensure all configurations are properly set up.',
                        ephemeral: true
                    });
                }
            }

            // Handle ticket close button
            if (customId === 'close_ticket') {
                await handleTicketClose(interaction);
            }

            // Handle confirm close button
            if (customId === 'confirm_close') {
                const reason = interaction.channel.closingReason || 'No reason provided';
                await handleConfirmClose(interaction, reason);
            }

            // Handle cancel close button
            if (customId === 'cancel_close') {
                await interaction.update({
                    content: 'Ticket close cancelled.',
                    components: [],
                    ephemeral: true
                });
            }
            if (customId.startsWith('suggestion_')) {
                const parts = customId.split('_');
                const action = parts[1];
                const message = interaction.message;
                const embed = message.embeds[0];

                try {
                    // Check if embed and footer exist
                    if (!embed || !embed.footer || !embed.footer.text) {
                        console.error('Invalid embed structure:', embed);
                        await interaction.reply({
                            content: 'This suggestion appears to be invalid.',
                            ephemeral: true
                        });
                        return;
                    }

                    // Get suggestion ID from footer
                    const match = embed.footer.text.match(/ID: (\d+)/);
                    if (!match) {
                        console.error('Could not find suggestion ID in footer:', embed.footer.text);
                        await interaction.reply({
                            content: 'Could not find suggestion ID.',
                            ephemeral: true
                        });
                        return;
                    }

                    const suggestionId = parseInt(match[1]);

                    switch (action) {
                        case 'upvote':
                        case 'downvote': {
                            // Handle voting
                            const result = await toggleVote(suggestionId, interaction.user.id, action);
                            const counts = await getVoteCounts(suggestionId);

                            // Get current components
                            const row = ActionRowBuilder.from(message.components[0]);
                            const components = row.components;

                            // Update button labels
                            components[0].setLabel(counts.upvotes.toString());    // Upvote button
                            components[2].setLabel(counts.downvotes.toString());  // Downvote button

                            // Update message with new counts
                            await message.edit({
                                embeds: [embed],
                                components: [row]
                            });

                            // Acknowledge the interaction
                            await interaction.deferUpdate();
                            break;
                        }
                        case 'thread': {
                            // Get thread message count
                            const thread = message.thread;
                            if (thread) {
                                const messageCount = (await thread.messages.fetch()).size - 1;

                                // Update thread count in database
                                await updateThreadCount(suggestionId, messageCount);

                                // Update button label
                                const row = ActionRowBuilder.from(message.components[0]);
                                const components = row.components;
                                components[1].setLabel(messageCount.toString());

                                await message.edit({
                                    embeds: [embed],
                                    components: [row]
                                });
                            }

                            await interaction.deferUpdate();
                            break;
                        }
                    }
                } catch (error) {
                    console.error('Error handling suggestion button:', error);
                    await interaction.reply({
                        content: 'There was an error processing your interaction.',
                        ephemeral: true
                    });
                }
            }



        }

        


        // Handle Modal Submissions
        // In your modal submission handling section, modify this part:
        // In your modal submission handling section, modify this part:
        // Handle Modal Submissions
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'close_ticket_modal') {
                const reason = interaction.fields.getTextInputValue('close_reason');
                await handleConfirmClose(interaction, reason);
                return;
            }

            if (interaction.customId.startsWith('application_')) {
                try {
                    const parts = interaction.customId.split('_');
                    const ticketId = parts.slice(1, -1).join('_');
                    const currentPage = parseInt(parts[parts.length - 1] || '1');

                    const configPath = path.join(__dirname, '../../data/tickets', `${ticketId}.json`);

                    if (!fs.existsSync(configPath)) {
                        return interaction.reply({
                            content: 'Application configuration not found! Please try again.',
                            ephemeral: true
                        });
                    }

                    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

                    if (!config.questions || config.questions.length === 0) {
                        return interaction.reply({
                            content: 'No questions found in the application configuration!',
                            ephemeral: true
                        });
                    }

                    let userResponses = applicationResponses.get(interaction.user.id) || [];

                    const formResponses = [];
                    interaction.fields.fields.forEach((field) => {
                        formResponses.push(field.value);
                    });
                    userResponses = [...userResponses, ...formResponses];

                    const totalQuestions = config.questions.length;
                    const questionsAnswered = userResponses.length;
                    const remainingQuestions = totalQuestions - questionsAnswered;

                    if (remainingQuestions > 0) {
                        // Store current responses
                        applicationResponses.set(interaction.user.id, userResponses);

                        // Create continue button
                        const continueButton = new ButtonBuilder()
                            .setCustomId(`continue_application_${config.id}_${currentPage + 1}`)
                            .setLabel('Continue Application')
                            .setStyle(ButtonStyle.Primary);

                        const row = new ActionRowBuilder().addComponents(continueButton);

                        await interaction.reply({
                            content: `Part ${currentPage} completed! Click the button below to continue with part ${currentPage + 1} of ${Math.ceil(totalQuestions / 5)}.`,
                            components: [row],
                            ephemeral: true
                        });
                    } else {
                        // All questions answered, create the ticket
                        await createApplicationTicket(interaction, config, userResponses);

                        // Clear stored responses
                        applicationResponses.delete(interaction.user.id);
                    }
                } catch (error) {
                    console.error('Modal Submit Error:', error);
                    await interaction.reply({
                        content: 'There was an error processing your application. Please try again.',
                        ephemeral: true
                    });
                }
            }
        }


    } catch (error) {
        console.error('General Interaction Error:', error);
    }
};



async function handleNormalTicket(interaction, config) {
    // Get the next ticket number
    const ticketNumber = await getNextTicketNumber(interaction.guildId);
    
    // Format ticket number with leading zeros (e.g., 0001)
    const formattedNumber = ticketNumber.toString().padStart(4, '0');
    
    // Create ticket name
    const ticketName = `${config.id}-${interaction.user.username}-${formattedNumber}`;

    const channel = await interaction.guild.channels.create({
        name: ticketName,
        type: 0,
        parent: config.category_id,
        permissionOverwrites: [
            {
                id: interaction.guild.id,
                deny: ['ViewChannel'],
            },
            {
                id: interaction.user.id,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
            },
            ...config.allowed_roles.map(roleId => ({
                id: roleId,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
            })),
        ],
    });

    const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeButton);

    await channel.send({
        content: `<@${interaction.user.id}>`,
        embeds: [
            new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Ticket Created')
                .setDescription(config.initial_message)
        ],
        components: [row]
    });

    await interaction.reply({
        content: `Your ticket has been created: ${channel}`,
        ephemeral: true
    });
}

async function handleApplicationTicket(interaction, config) {
    try {
        if (!config.questions || config.questions.length === 0) {
            return interaction.reply({
                content: 'This application has no questions configured!',
                ephemeral: true
            });
        }
        await showApplicationForm(interaction, config, 1, 0);
    } catch (error) {
        console.error('Application Start Error:', error);
        await interaction.reply({
            content: 'There was an error starting your application. Please try again.',
            ephemeral: true
        });
    }
}

async function showApplicationForm(interaction, config, page, startIndex) {
    try {
        const questionsForThisPage = config.questions.slice(startIndex, startIndex + 5);

        if (questionsForThisPage.length === 0) {
            throw new Error('No questions available for this page');
        }

        const modal = new ModalBuilder()
            .setCustomId(`application_${config.id}_${page}`)
            .setTitle(`Application Form (Part ${page} of ${Math.ceil(config.questions.length / 5)})`);

        questionsForThisPage.forEach((questionData, index) => {
            // Handle both old format (string) and new format (object)
            const question = typeof questionData === 'string'
                ? {
                    question: questionData,
                    style: TextInputStyle.Paragraph,
                    placeholder: '',
                    minLength: 1,
                    maxLength: 1000
                }
                : {
                    question: questionData.question,
                    style: questionData.style === 1 ? TextInputStyle.Short : TextInputStyle.Paragraph,
                    placeholder: questionData.placeholder || '',
                    minLength: questionData.minLength || 1,
                    maxLength: questionData.maxLength || 1000
                };

            const textInput = new TextInputBuilder()
                .setCustomId(`question_${startIndex + index}`)
                .setLabel(question.question.substring(0, 45))
                .setStyle(question.style)
                .setRequired(true)
                .setMinLength(question.minLength)
                .setMaxLength(question.maxLength);

            // Add placeholder if it exists
            if (question.placeholder) {
                textInput.setPlaceholder(question.placeholder);
            }

            modal.addComponents(new ActionRowBuilder().addComponents(textInput));
        });

        await interaction.showModal(modal);
    } catch (error) {
        console.error('Show Form Error:', error);
        throw error;
    }
}


async function createApplicationTicket(interaction, config, responses) {
    try {
        // Get the next ticket number
        const ticketNumber = await getNextTicketNumber(interaction.guildId);
        
        // Format ticket number with leading zeros
        const formattedNumber = ticketNumber.toString().padStart(4, '0');
        
        // Create ticket name
        const ticketName = `${config.id}-${interaction.user.username}-${formattedNumber}`;

        const channel = await interaction.guild.channels.create({
            name: ticketName,
            type: 0,
            parent: config.category_id,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: ['ViewChannel'],
                },
                {
                    id: interaction.user.id,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
                },
                ...config.allowed_roles.map(roleId => ({
                    id: roleId,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
                })),
            ],
        });

        const closeButton = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Application')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(closeButton);

        const responseEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Application Submission')
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        config.questions.forEach((questionData, index) => {
            // Handle both old format (string) and new format (object)
            const question = typeof questionData === 'string'
                ? questionData
                : questionData.question;

            responseEmbed.addFields({
                name: question,
                value: responses[index] || 'No answer provided'
            });
        });

        await channel.send({
            content: `<@${interaction.user.id}>`,
            embeds: [responseEmbed],
            components: [row]
        });

        // Execute followup slash command if specified
        console.log('Checking for followup command...');
        if (config.followup_command) {
            console.log(`Attempting to execute slash command: ${config.followup_command}`);
            console.log('Available slash commands:', Array.from(interaction.client.slashCommands.keys()));

            try {
                const commandData = interaction.client.slashCommands.get(config.followup_command);
                if (!commandData) {
                    console.log('Slash command not found:', config.followup_command);
                    return;
                }

                console.log('Found command:', commandData.data.name);

                // Create a new interaction-like object for the command
                const commandInteraction = {
                    ...interaction,
                    channel: channel,
                    commandName: config.followup_command,
                    options: new Collection(),
                    reply: async (options) => {
                        return await channel.send(options);
                    },
                    followUp: async (options) => {
                        return await channel.send(options);
                    },
                    deferReply: async () => {
                        // Do nothing for defer
                    },
                    editReply: async (options) => {
                        return await channel.send(options);
                    }
                };

                // Execute the slash command in the new channel
                await commandData.execute(commandInteraction);
                console.log('Followup slash command executed successfully');

            } catch (error) {
                console.error('Error executing follow-up slash command:', error);
            }
        }

        await interaction.reply({
            content: `Your application has been submitted in ${channel}`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Create Application Ticket Error:', error);
        throw error;
    }
}



async function handleTicketClose(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('close_ticket_modal')
        .setTitle('Close Ticket');

    const reasonInput = new TextInputBuilder()
        .setCustomId('close_reason')
        .setLabel('Reason for closing')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Enter the reason for closing this ticket')
        .setRequired(true)
        .setMaxLength(1000);

    const firstActionRow = new ActionRowBuilder().addComponents(reasonInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
}
async function handleConfirmClose(interaction, reason) {
    try {
        const channel = interaction.channel;

        // Fetch all messages in the channel
        let allMessages = [];
        let lastId;

        while (true) {
            const options = { limit: 100 };
            if (lastId) options.before = lastId;

            const messages = await channel.messages.fetch(options);
            if (messages.size === 0) break;

            allMessages = allMessages.concat(Array.from(messages.values()));
            lastId = messages.last().id;
        }

        // Sort messages by timestamp (oldest first)
        allMessages = allMessages.reverse();

        // Create transcript content
        let transcriptContent = `Ticket Transcript: ${channel.name}\n`;
        transcriptContent += `Created at: ${channel.createdAt}\n`;
        transcriptContent += `Closed by: ${interaction.user.tag}\n`;
        transcriptContent += `Reason: ${reason}\n`;
        transcriptContent += `----------------------------------------\n\n`;

        // Add messages to transcript
        for (const message of allMessages) {
            const timestamp = message.createdAt.toLocaleString();
            transcriptContent += `[${timestamp}] ${message.author.tag}:\n`;

            // Add message content if it exists
            if (message.content) {
                transcriptContent += `${message.content}\n`;
            }

            // Add embed content if it exists
            if (message.embeds.length > 0) {
                message.embeds.forEach(embed => {
                    transcriptContent += `\nEmbed Content:\n`;
                    if (embed.title) transcriptContent += `Title: ${embed.title}\n`;
                    if (embed.description) transcriptContent += `Description: ${embed.description}\n`;

                    // Add embed fields
                    if (embed.fields && embed.fields.length > 0) {
                        transcriptContent += `\nFields:\n`;
                        embed.fields.forEach(field => {
                            transcriptContent += `${field.name}: ${field.value}\n`;
                        });
                    }
                    transcriptContent += `\n`;
                });
            }

            // Add attachments if any
            if (message.attachments.size > 0) {
                transcriptContent += `Attachments:\n`;
                message.attachments.forEach(attachment => {
                    transcriptContent += `- ${attachment.url}\n`;
                });
            }

            transcriptContent += `\n----------------------------------------\n`;
        }

        // Create and save transcript file
        const fileName = `${channel.name}-transcript.txt`;
        const transcriptPath = path.join(__dirname, '../../data/transcripts', fileName);

        // Ensure directory exists
        const dir = path.dirname(transcriptPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(transcriptPath, transcriptContent, 'utf8');

        // Get the logs channel from config
        const configPath = path.join(__dirname, '../../data/config.json');
        let config = {};

        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        const logsChannel = interaction.guild.channels.cache.get(config.logsChannelId);

        if (!logsChannel) {
            await interaction.reply({
                content: 'Could not find logs channel! Please contact an administrator.',
                ephemeral: true
            });
            return;
        }

        // Create an embed for the transcript
        const embed = new EmbedBuilder()
            .setTitle('Ticket Closed')
            .setDescription(`Ticket: ${channel.name}`)
            .addFields(
                { name: 'Closed by', value: `${interaction.user.tag}`, inline: true },
                { name: 'Created by', value: `<@${channel.topic || 'Unknown'}>`, inline: true },
                { name: 'Reason', value: reason || 'No reason provided', inline: false },
                { name: 'Closed at', value: new Date().toLocaleString(), inline: true }
            )
            .setColor('#ff0000')
            .setTimestamp();

        // Send transcript to logs channel
        await logsChannel.send({
            embeds: [embed],
            files: [{
                attachment: transcriptPath,
                name: fileName
            }]
        });

        // Notify the user
        await interaction.reply({
            content: 'Ticket closed and transcript saved.',
            ephemeral: true
        });

        // Delete the local transcript file after sending
        fs.unlinkSync(transcriptPath);

        // Delete the channel after a short delay
        setTimeout(() => channel.delete(), 5000);

    } catch (error) {
        console.error('Error closing ticket:', error);
        await interaction.reply({
            content: 'There was an error closing the ticket. Please try again.',
            ephemeral: true
        });
    }
}

