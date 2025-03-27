const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Shows the bot's latency.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles), // Requires Admin permission
  async execute(interaction) {
    const ping = Date.now() - interaction.createdTimestamp;
    await interaction.reply(`🏓 Pong! Latency: **${ping}ms**`);
  },
};
