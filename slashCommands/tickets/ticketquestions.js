const { SlashCommandBuilder } = require('discord.js');
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
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('placeholder')
                        .setDescription('Placeholder text for the answer field')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('style')
                        .setDescription('Text input style')
                        .addChoices(
                            { name: 'Short (single line)', value: 1 },
                            { name: 'Paragraph (multiple lines)', value: 2 }
                        )
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('min_length')
                        .setDescription('Minimum length of the answer')
                        .setMinValue(0)
                        .setMaxValue(4000)
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('max_length')
                        .setDescription('Maximum length of the answer')
                        .setMinValue(1)
                        .setMaxValue(4000)
                        .setRequired(false)))
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
                const newQuestion = {
                    question: interaction.options.getString('question'),
                    placeholder: interaction.options.getString('placeholder') || '',
                    style: interaction.options.getInteger('style') || 2, // Default to paragraph
                    minLength: interaction.options.getInteger('min_length') || 1,
                    maxLength: interaction.options.getInteger('max_length') || 4000
                };

                config.questions.push(newQuestion);
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

                const addEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('Question Added')
                    .addFields(
                        { name: 'Question', value: newQuestion.question },
                        { name: 'Placeholder', value: newQuestion.placeholder || 'None' },
                        { name: 'Style', value: newQuestion.style === 1 ? 'Short' : 'Paragraph' },
                        { name: 'Min Length', value: newQuestion.minLength.toString() },
                        { name: 'Max Length', value: newQuestion.maxLength.toString() }
                    );

                await interaction.reply({
                    embeds: [addEmbed],
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

                const removedQuestion = config.questions.splice(questionNumber - 1, 1)[0];
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                
                const removeEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Question Removed')
                    .addFields(
                        { name: 'Removed Question', value: removedQuestion.question },
                        { name: 'Total Questions Remaining', value: config.questions.length.toString() }
                    );

                await interaction.reply({
                    embeds: [removeEmbed],
                    ephemeral: true
                });
                break;

            case 'list':
                const listEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('Application Questions')
                    .setDescription('Here are all the questions for this application:');
                
                if (config.questions.length === 0) {
                    listEmbed.addFields({ name: 'No Questions', value: 'This application has no questions yet.' });
                } else {
                    config.questions.forEach((question, index) => {
                        listEmbed.addFields({ 
                            name: `Question ${index + 1}`, 
                            value: `**Question:** ${question.question}\n` +
                                   `**Placeholder:** ${question.placeholder || 'None'}\n` +
                                   `**Style:** ${question.style === 1 ? 'Short' : 'Paragraph'}\n` +
                                   `**Length:** ${question.minLength}-${question.maxLength} characters`
                        });
                    });
                }
                
                await interaction.reply({
                    embeds: [listEmbed],
                    ephemeral: true
                });
                break;
        }
    }
};
