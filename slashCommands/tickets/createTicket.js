// File: slashCommands/tickets/createTicket.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createticketbutton')
        .setDescription('Create a new ticket button')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Custom ID for this ticket configuration (e.g., staff_app, support_ticket)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of ticket button')
                .setRequired(true)
                .addChoices(
                    { name: 'Normal Ticket', value: 'normal' },
                    { name: 'Application', value: 'application' }
                ))
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Title for the embed')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Description for the embed')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('buttonname')
                .setDescription('Text to display on the button')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role1')
                .setDescription('First role that can see tickets')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('category')
                .setDescription('Category where tickets will be created')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('initial_message')
                .setDescription('Message shown when ticket is created')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role2')
                .setDescription('Second role that can see tickets')
                .setRequired(false))
        .addRoleOption(option =>
            option.setName('role3')
                .setDescription('Third role that can see tickets')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('followup_command')
                .setDescription('Slash command to run after ticket creation')
                .setRequired(false)),

    async execute(interaction) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ 
                content: 'You need Administrator permissions to use this command.', 
                ephemeral: true 
            });
        }

        const customId = interaction.options.getString('id');
        const type = interaction.options.getString('type');
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const buttonName = interaction.options.getString('buttonname');
        const initialMessage = interaction.options.getString('initial_message');
        const category = interaction.options.getChannel('category');
        
        // Get roles and filter out null values (optional roles not provided)
        const roles = [
            interaction.options.getRole('role1'),
            interaction.options.getRole('role2'),
            interaction.options.getRole('role3')
        ].filter(role => role !== null);

        // Validate category type
        if (category.type !== 4) { // 4 is the category channel type
            return interaction.reply({
                content: 'Please select a category channel!',
                ephemeral: true
            });
        }

        // Validate custom ID format
        if (!/^[a-zA-Z0-9_-]+$/.test(customId)) {
            return interaction.reply({
                content: 'Custom ID can only contain letters, numbers, underscores, and hyphens.',
                ephemeral: true
            });
        }

        // Check if configuration with this ID already exists
        const configPath = path.join(__dirname, '../../data/tickets');
        if (fs.existsSync(path.join(configPath, `${customId}.json`))) {
            return interaction.reply({
                content: `A ticket configuration with ID "${customId}" already exists. Please choose a different ID.`,
                ephemeral: true
            });
        }
        
        // Create ticket configuration
        const ticketConfig = {
            id: customId,
            type: type,
            name: title,
            initial_message: initialMessage,
            allowed_roles: roles.map(role => role.id),
            category_id: category.id,
            created_by: interaction.user.id,
            created_at: new Date().toISOString(),
            followup_command: interaction.options.getString('followup_command')
        };
        if (ticketConfig.followup_command) {
            const command = interaction.client.commands.get(ticketConfig.followup_command);
            if (command) {
                try {
                    await command.execute({
                        channel: channel,
                        guild: interaction.guild,
                        user: interaction.user,
                        member: interaction.member,
                        client: interaction.client,
                        // Add any other necessary properties
                    });
                } catch (error) {
                    console.error('Error executing follow-up command:', error);
                }
            }
        }

        // If it's an application type, initialize the questions array
        if (type === 'application') {
            ticketConfig.questions = [];
        }

        // Ensure directory exists
        if (!fs.existsSync(configPath)) {
            fs.mkdirSync(configPath, { recursive: true });
        }

        // Save configuration
        fs.writeFileSync(
            path.join(configPath, `${customId}.json`),
            JSON.stringify(ticketConfig, null, 2)
        );

        // Create the button
        const button = new ButtonBuilder()
            .setCustomId(`create_ticket_${customId}`)
            .setLabel(buttonName)
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(title)
            .setDescription(description);

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });

        // If it's an application type, remind to set questions
        if (type === 'application') {
            await interaction.followUp({
                content: `Don't forget to set the application questions using \`/ticketquestions id:${customId} action:add question:Your question here\``,
                ephemeral: true
            });
        }
    },
};
