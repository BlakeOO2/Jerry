const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addBug, getBugs, updateBugStatus, addBugNote, getBugNotes, getBugById } = require('../../handlers/database');

const OWNER_ID = '479720473941245962';

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
            sub.setName('setstatus')
                .setDescription('Update the status of a bug')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('Bug ID')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('status')
                        .setDescription('New status')
                        .addChoices(
                            { name: 'Reported', value: 'reported' },
                            { name: 'Investigating', value: 'investigating' },
                            { name: 'Testing', value: 'testing' },
                            { name: 'Coding', value: 'coding' },
                            { name: 'Pending Update', value: 'pending update' },
                            { name: 'Fixed', value: 'fixed' }
                        )
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('addnote')
                .setDescription('Add a note to a bug')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('Bug ID')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('note')
                        .setDescription('Note text')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('show')
                .setDescription('Show bugs or a specific bug')
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
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('Show a specific bug by ID')
                        .setRequired(false))),
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        if (sub !== 'show' && userId !== OWNER_ID) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }
        if (sub === 'add') {
            const parent = interaction.options.getString('parent');
            const status = interaction.options.getString('status');
            const description = interaction.options.getString('description');
            const priority = interaction.options.getString('priority');
            await addBug(parent, status, description, priority);
            await interaction.reply({ content: `Bug added!\n**Parent:** ${parent}\n**Status:** ${status}\n**Priority:** ${priority}\n**Description:** ${description}` });
        } else if (sub === 'setstatus') {
            const id = interaction.options.getInteger('id');
            const status = interaction.options.getString('status');
            await updateBugStatus(id, status);
            await interaction.reply({ content: `Bug #${id} status updated to **${status}**.` });
        } else if (sub === 'addnote') {
            const id = interaction.options.getInteger('id');
            const note = interaction.options.getString('note');
            await addBugNote(id, note);
            await interaction.reply({ content: `Note added to bug #${id}.` });
        } else if (sub === 'show') {
            const bugId = interaction.options.getInteger('id');
            if (bugId) {
                // Show a specific bug with all notes
                const bug = await getBugById(bugId);
                if (!bug) {
                    return interaction.reply({ content: `Bug #${bugId} not found.`, ephemeral: true });
                }
                const notes = await getBugNotes(bugId);
                const embed = new EmbedBuilder()
                    .setTitle(`Bug #${bug.id}`)
                    .setDescription(`**Parent:** ${bug.parent}\n**Status:** ${bug.status}\n**Priority:** ${bug.priority}\n${bug.description}`)
                    .setColor(0xff0000);
                if (notes.length) {
                    embed.addFields({ name: 'Notes', value: notes.map((n, i) => `${i + 1}. ${n.note}`).join('\n') });
                }
                return await interaction.reply({ embeds: [embed] });
            }
            // Show all bugs, grouped by parent, with last note if present
            const parent = interaction.options.getString('parent');
            const priority = interaction.options.getString('priority');
            let status = interaction.options.getString('status');
            let showAll = false;
            if (status && status.toLowerCase() === 'all') showAll = true;
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
                let value = '';
                for (const bug of grouped[group]) {
                    value += `#${bug.id}: ${bug.description}\nPriority: **${bug.priority}**`;
                    const notes = await getBugNotes(bug.id);
                    if (notes.length) {
                        value += `\n_Last note: ${notes[notes.length - 1].note}_`;
                    }
                    value += '\n\n';
                }
                embed.addFields({ name: prettyGroup, value: value.length > 1024 ? value.slice(0, 1020) + '...' : value });
            }
            await interaction.reply({ embeds: [embed] });
        }
    }
};
