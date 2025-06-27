const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require('discord.js');
const {
    addGitRepo,
    removeGitRepo,
    listGitRepos,
    subscribeChannelToRepo,
    toggleGitUpdates,
    listChannelSubscriptions
} = require('../../handlers/database');

function parseRepoUrl(url) {
    // Accepts https://github.com/owner/repo or owner/repo
    const match = url.match(/github.com\/(.+?\/[^\/?#]+)/i) || url.match(/^([\w-]+\/[\w-]+)/);
    return match ? match[1] : null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('git')
        .setDescription('Manage GitHub repo following and notifications')
        .addSubcommand(sub =>
            sub.setName('channel')
                .setDescription('Set the channel for posting git updates')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to post updates in')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('toggle')
                .setDescription('Toggle posting updates in this channel'))
        .addSubcommand(sub =>
            sub.setName('addrepo')
                .setDescription('Add a GitHub repo to follow')
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('GitHub repo URL')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List followed GitHub repos'))
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a repo from the follow list')
                .addStringOption(option =>
                    option.setName('repo')
                        .setDescription('Repo to remove (owner/repo)')
                        .setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'channel') {
            const channel = interaction.options.getChannel('channel');
            // For demo: subscribe this channel to all repos (in real use, you'd want to specify which repo)
            const repos = await listGitRepos();
            if (repos.length === 0) {
                return interaction.reply({ content: 'No repos to subscribe to. Add a repo first with /git addrepo.', ephemeral: true });
            }
            for (const repo of repos) {
                await subscribeChannelToRepo(channel.id, repo.repo);
            }
            await interaction.reply({ content: `Git updates will be posted in ${channel} for all followed repos.` });
        } else if (sub === 'toggle') {
            // For demo: toggle all subscriptions for this channel
            const channelId = interaction.channel.id;
            const subs = await listChannelSubscriptions(channelId);
            if (subs.length === 0) {
                return interaction.reply({ content: 'No repo subscriptions found for this channel.', ephemeral: true });
            }
            let toggled = 0;
            for (const sub of subs) {
                await toggleGitUpdates(channelId, sub.repo);
                toggled++;
            }
            await interaction.reply({ content: `Toggled git update posting for this channel for ${toggled} repos.` });
        } else if (sub === 'addrepo') {
            const url = interaction.options.getString('url');
            const repo = parseRepoUrl(url);
            if (!repo) {
                return interaction.reply({ content: 'Invalid GitHub repo URL or format. Use https://github.com/owner/repo or owner/repo.', ephemeral: true });
            }
            await addGitRepo(repo, url);
            await interaction.reply({ content: `Added repo: ${repo}` });
        } else if (sub === 'list') {
            const repos = await listGitRepos();
            if (!repos.length) {
                const embed = new EmbedBuilder()
                    .setTitle('Followed GitHub Repos')
                    .setDescription('No repos followed yet.')
                    .setColor(0x7289da);
                return await interaction.reply({ embeds: [embed] });
            }
            const embed = new EmbedBuilder()
                .setTitle('Followed GitHub Repos')
                .setColor(0x7289da)
                .setDescription(repos.map(r => `• [${r.repo}](${r.url})`).join('\n'));
            await interaction.reply({ embeds: [embed] });
        } else if (sub === 'remove') {
            const repo = interaction.options.getString('repo');
            await removeGitRepo(repo);
            await interaction.reply({ content: `Removed repo: ${repo}` });
        }
    }
};
