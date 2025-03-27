const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nay")
    .setDescription("Nays a user with the 'nomad' role.")
    .addUserOption(option =>
      option.setName("target")
        .setDescription("The user to nay.")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("reason")
        .setDescription("The reason for the nay."))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers), // Requires Kick Members permission
  async execute(interaction) {
    const target = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason");

    if (!target) {
      return interaction.reply("You must specify a user to nay.");
    }

    const member = interaction.guild.members.cache.get(target.id);
    if (!member) {
      return interaction.reply("That user is not in this server.");
    }

    const nomadRole = interaction.guild.roles.cache.find(role => role.name === "Nomads");
    if (!nomadRole) {
      return interaction.reply("The 'nomad' role does not exist in this server.");
    }

    if (!member.roles.cache.has(nomadRole.id)) {
      return interaction.reply("That user does not have the 'nomad' role.");
    }

    try {
      await member.kick(reason);
      await interaction.reply(`Nayed ${target}! Reason: ${reason || "No reason provided"}`);
    } catch (error) {
      console.error(error);
      await interaction.reply("I do not have permission to kick that user.");
    }
  },
};
