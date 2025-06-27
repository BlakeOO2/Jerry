const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addBug, getBugs } = require('../../handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bug')
        .setDescription('Bug logging and listing system')
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a new bug to the list')
                .addStringOption(option =>
                    option.setName('parent')
                        .setDescription('Bug parent/category (e.g., discord, landclaims, etc)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('status')
                        .setDescription('Bug status')
                        .addChoices(
                            { name: 'Reported', value: 'reported' },
                            { name: 'Investigating', value: 'investigating' },
                            { name: 'Testing', value: 'testing' },
                            { name: 'Coding', value: 'coding' },
                            { name: 'Pending Update', value: 'pending update' },
                            { name: 'Fixed', value: 'fixed' }
                        )
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Detailed bug description')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('priority')
                        .setDescription('Priority (low, medium, high)')
                        .addChoices(
                            { name: 'Low', value: 'low' },
                            { name: 'Medium', value: 'medium' },
                            { name: 'High', value: 'high' }
                        )
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('show')
                .setDescription('Show bugs')
                .addStringOption(option =>
                    option.setName('parent')
                        .setDescription('Show only bugs for this parent (case-insensitive)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('priority')
                        .setDescription('Show only bugs with this priority')
                        .addChoices(
                            { name: 'Low', value: 'low' },
                            { name: 'Medium', value: 'medium' },
                            { name: 'High', value: 'high' }
                        )
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('status')
                        .setDescription('Show only bugs with this status (or "all" to show fixed)')
                        .addChoices(
                            { name: 'Reported', value: 'reported' },
                            { name: 'Investigating', value: 'investigating' },
                            { name: 'Testing', value: 'testing' },
                            { name: 'Coding', value: 'coding' },
                            { name: 'Pending Update', value: 'pending update' },
                            { name: 'Fixed', value: 'fixed' },
                            { name: 'All', value: 'all' }
                        )
                        .setRequired(false))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'add') {
            const parent = interaction.options.getString('parent');
            const status = interaction.options.getString('status');
            const description = interaction.options.getString('description');
            const priority = interaction.options.getString('priority');
            await addBug(parent, status, description, priority);
            await interaction.reply({ content: `Bug added!\n**Parent:** ${parent}\n**Status:** ${status}\n**Priority:** ${priority}\n**Description:** ${description}` });
        } else if (sub === 'show') {
            const parent = interaction.options.getString('parent');
            const priority = interaction.options.getString('priority');
            let status = interaction.options.getString('status');
            let showAll = false;
            if (status && status.toLowerCase() === 'all') showAll = true;
            // If no status option, default to not showing fixed
            const bugs = await getBugs({ parent, priority, status, showAll });
            if (!bugs || bugs.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('Bug List')
                    .setDescription('No bugs found.')
                    .setColor(0xff0000);
                return await interaction.reply({ embeds: [embed] });
            }
            // Group by parent (case-insensitive)
            const grouped = {};
            for (const bug of bugs) {
                const group = bug.parent.trim().toLowerCase();
                if (!grouped[group]) grouped[group] = [];
                grouped[group].push(bug);
            }
            const embed = new EmbedBuilder()
                .setTitle('Bug List')
                .setColor(0xff0000);
            for (const group in grouped) {
                const prettyGroup = grouped[group][0].parent;
                const value = grouped[group].map(bug => `**Status:** ${bug.status}\n**Priority:** ${bug.priority}\n${bug.description}`).join('\n\n');
                embed.addFields({ name: prettyGroup, value: value.length > 1024 ? value.slice(0, 1020) + '...' : value });
            }
            await interaction.reply({ embeds: [embed] });
        }
    }
};
