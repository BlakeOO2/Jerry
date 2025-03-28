// slashcommands/tickets/questions.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketquestions')
        .setDescription('Manage application ticket questions')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a question to an application ticket')
                .addStringOption(option =>
                    option.setName('ticket_id')
                        .setDescription('The ID of the application ticket')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('question')
                        .setDescription('The question to add')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a question from an application ticket')
                .addStringOption(option =>
                    option.setName('ticket_id')
                        .setDescription('The ID of the application ticket')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('question_number')
                        .setDescription('The number of the question to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all questions for an application ticket')
                .addStringOption(option =>
                    option.setName('ticket_id')
                        .setDescription('The ID of the application ticket')
                        .setRequired(true))),

    async execute(interaction) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({
                content: 'You need Administrator permissions to use this command.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const ticketId = interaction.options.getString('ticket_id');
        const configPath = path.join(__dirname, '../../data/tickets', `${ticketId}.json`);

        // Check if ticket exists
        if (!fs.existsSync(configPath)) {
            return interaction.reply({
                content: 'Ticket configuration not found!',
                ephemeral: true
            });
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        // Check if it's an application ticket
        if (config.type !== 'application') {
            return interaction.reply({
                content: 'This command only works with application tickets!',
                ephemeral: true
            });
        }

        // Initialize questions array if it doesn't exist
        config.questions = config.questions || [];

        switch (subcommand) {
            case 'add':
                const newQuestion = interaction.options.getString('question');
                config.questions.push(newQuestion);
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                
                await interaction.reply({
                    content: `Question added! Total questions: ${config.questions.length}`,
                    ephemeral: true
                });
                break;

            case 'remove':
                const questionNumber = interaction.options.getInteger('question_number');
                
                if (questionNumber < 1 || questionNumber > config.questions.length) {
                    return interaction.reply({
                        content: 'Invalid question number!',
                        ephemeral: true
                    });
                }

                config.questions.splice(questionNumber - 1, 1);
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                
                await interaction.reply({
                    content: `Question removed! Total questions: ${config.questions.length}`,
                    ephemeral: true
                });
                break;

            case 'list':
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('Application Questions')
                    .setDescription('Here are all the questions for this application:');

                if (config.questions.length === 0) {
                    embed.addFields({ name: 'No Questions', value: 'This application has no questions yet.' });
                } else {
                    config.questions.forEach((question, index) => {
                        embed.addFields({ name: `Question ${index + 1}`, value: question });
                    });
                }

                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
                break;
        }
    }
};
