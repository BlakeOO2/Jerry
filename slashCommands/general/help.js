const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows a list of available commands or details about a specific command.")
    .addStringOption(option =>
      option.setName("command")
        .setDescription("Get detailed info about a specific command.")
        .setRequired(false)
    ),

  async execute(interaction) {
    const { client, member } = interaction;
    const commandName = interaction.options.getString("command");
    const commands = client.slashCommands;

    if (commandName) {
      // Show details for a specific command
      const command = commands.get(commandName.toLowerCase());

      if (!command) {
        return interaction.reply({ content: `❌ No command found with the name \`${commandName}\`.`, ephemeral: true });
      }

      const requiredPerms = command.data.default_member_permissions;
      const readablePerms = requiredPerms
        ? Object.keys(PermissionFlagsBits).filter(perm => (BigInt(requiredPerms) & PermissionFlagsBits[perm]) !== 0)
        : [];

      const hasPermission = !requiredPerms || member.permissions.has(BigInt(requiredPerms));
      if (!hasPermission) {
        return interaction.reply({ content: `❌ You don't have permission to use \`/${commandName}\`.`, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle(`📌 Command: /${command.data.name}`)
        .setColor("Blue")
        .setDescription(command.data.description)
        .addFields([
          { name: "🔹 Arguments", value: command.data.options.map(opt => `\`${opt.name}\`: ${opt.description}`).join("\n") || "No arguments" },
          { name: "🔹 Required Permissions", value: readablePerms.length ? readablePerms.join(", ") : "None" },
        ])
        .setFooter({ text: "Use /help to see all available commands." });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Show all available commands
    let availableCommands = [];

    commands.forEach(command => {
      const requiredPerms = command.data.default_member_permissions;
      const readablePerms = requiredPerms
        ? Object.keys(PermissionFlagsBits).filter(perm => (BigInt(requiredPerms) & PermissionFlagsBits[perm]) !== 0)
        : [];

      const hasPermission = !requiredPerms || member.permissions.has(BigInt(requiredPerms));
      if (hasPermission) {
        availableCommands.push({
          name: `/${command.data.name}`,
          description: command.data.description,
          options: command.data.options.map(opt => `\`${opt.name}\`: ${opt.description}`).join("\n") || "No arguments",
          permissions: readablePerms.length ? readablePerms.join(", ") : "None",
        });
      }
    });

    if (availableCommands.length === 0) {
      return interaction.reply({ content: "❌ You don't have access to any commands.", ephemeral: true });
    }

    

    const embed = new EmbedBuilder()
      .setTitle("📜 Available Commands")
      .setColor("Blue")
      .setDescription("Here are the commands you have access to:")
      .addFields(
        availableCommands.map(cmd => ({
          name: cmd.name,
          value: `**Description:** ${cmd.description}\n**Arguments:**\n${cmd.options}\n**Permissions:** ${cmd.permissions}`,
        }))
      )
      .setFooter({ text: "Use /help [command] for details on a specific command." });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
