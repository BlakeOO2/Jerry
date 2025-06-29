const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../../config/automod.json');
const OWNER_ID = '479720473941245962';

function loadConfig() {
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}
function saveConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Manage automod settings')
    .addSubcommand(sub =>
      sub.setName('addword')
        .setDescription('Add a word to the filter list')
        .addStringOption(opt => opt.setName('word').setDescription('Word to filter').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('removeword')
        .setDescription('Remove a word from the filter list')
        .addStringOption(opt => opt.setName('word').setDescription('Word to remove').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('addlink')
        .setDescription('Add a domain to the whitelist')
        .addStringOption(opt => opt.setName('domain').setDescription('Domain to whitelist').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('removelink')
        .setDescription('Remove a domain from the whitelist')
        .addStringOption(opt => opt.setName('domain').setDescription('Domain to remove').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('whitelist')
        .setDescription('Whitelist a user to bypass automod')
        .addUserOption(opt => opt.setName('user').setDescription('User to whitelist').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('unwhitelist')
        .setDescription('Remove a user from the whitelist')
        .addUserOption(opt => opt.setName('user').setDescription('User to unwhitelist').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Show current automod config')),

  async execute(interaction) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }
    const config = loadConfig();
    const sub = interaction.options.getSubcommand();
    if (sub === 'addword') {
      const word = interaction.options.getString('word');
      if (!config.filteredWords.includes(word)) {
        config.filteredWords.push(word);
        saveConfig(config);
        return interaction.reply({ content: `Added \`${word}\` to filtered words.` });
      } else {
        return interaction.reply({ content: `\`${word}\` is already filtered.`, ephemeral: true });
      }
    } else if (sub === 'removeword') {
      const word = interaction.options.getString('word');
      const idx = config.filteredWords.indexOf(word);
      if (idx !== -1) {
        config.filteredWords.splice(idx, 1);
        saveConfig(config);
        return interaction.reply({ content: `Removed \`${word}\` from filtered words.` });
      } else {
        return interaction.reply({ content: `\`${word}\` is not in the filter list.`, ephemeral: true });
      }
    } else if (sub === 'addlink') {
      const domain = interaction.options.getString('domain');
      if (!config.whitelistedLinks.includes(domain)) {
        config.whitelistedLinks.push(domain);
        saveConfig(config);
        return interaction.reply({ content: `Added \`${domain}\` to whitelisted links.` });
      } else {
        return interaction.reply({ content: `\`${domain}\` is already whitelisted.`, ephemeral: true });
      }
    } else if (sub === 'removelink') {
      const domain = interaction.options.getString('domain');
      const idx = config.whitelistedLinks.indexOf(domain);
      if (idx !== -1) {
        config.whitelistedLinks.splice(idx, 1);
        saveConfig(config);
        return interaction.reply({ content: `Removed \`${domain}\` from whitelisted links.` });
      } else {
        return interaction.reply({ content: `\`${domain}\` is not in the whitelist.`, ephemeral: true });
      }
    } else if (sub === 'whitelist') {
      if (!config.whitelistedUsers) config.whitelistedUsers = [];
      const user = interaction.options.getUser('user');
      if (!config.whitelistedUsers.includes(user.id)) {
        config.whitelistedUsers.push(user.id);
        saveConfig(config);
        return interaction.reply({ content: `Whitelisted <@${user.id}>.` });
      } else {
        return interaction.reply({ content: `<@${user.id}> is already whitelisted.`, ephemeral: true });
      }
    } else if (sub === 'unwhitelist') {
      if (!config.whitelistedUsers) config.whitelistedUsers = [];
      const user = interaction.options.getUser('user');
      const idx = config.whitelistedUsers.indexOf(user.id);
      if (idx !== -1) {
        config.whitelistedUsers.splice(idx, 1);
        saveConfig(config);
        return interaction.reply({ content: `Removed <@${user.id}> from whitelist.` });
      } else {
        return interaction.reply({ content: `<@${user.id}> is not whitelisted.`, ephemeral: true });
      }
    } else if (sub === 'list') {
      const embed = new EmbedBuilder()
        .setTitle('Automod Config')
        .addFields(
          { name: 'Filtered Words', value: config.filteredWords.join(', ') || 'None', inline: false },
          { name: 'Whitelisted Links', value: config.whitelistedLinks.join(', ') || 'None', inline: false },
          { name: 'Whitelisted Users', value: (config.whitelistedUsers || []).map(id => `<@${id}>`).join(', ') || 'None', inline: false }
        )
        .setColor(0x7289da);
      return interaction.reply({ embeds: [embed] });
    }
  }
};
