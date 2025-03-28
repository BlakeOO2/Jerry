const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const WELCOME_CHANNEL_ID = "1342470117585453159"; // Replace with the actual welcome channel ID

module.exports = {
  data: new SlashCommandBuilder()
    .setName("yay")
    .setDescription("Welcomes a 'Nomad' user into the community and optionally sets a new nickname.")
    .addUserOption(option =>
      option.setName("target")
        .setDescription("The user to welcome.")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("nickname")
        .setDescription("The new nickname for the user. (Optional)"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles), // Requires Manage Roles permission

  async execute(interaction) {
    const target = interaction.options.getUser("target");
    const newNickname = interaction.options.getString("nickname");
    const member = interaction.guild.members.cache.get(target.id);
    if (!member) return interaction.reply({ content: "That user is not in this server.", ephemeral: true });

    const nomadRole = interaction.guild.roles.cache.find(role => role.name === "Nomads");
    if (!nomadRole) return interaction.reply({ content: "The 'Nomads' role does not exist in this server.", ephemeral: true });

    if (!member.roles.cache.has(nomadRole.id)) {
      return interaction.reply({ content: "That user does not have the 'Nomads' role.", ephemeral: true });
    }

    try {
      await member.roles.remove(nomadRole);

      if (newNickname) {
        await member.setNickname(newNickname).catch(err => {
          console.error("Failed to set nickname:", err);
          return interaction.reply({ content: "I was unable to change the nickname. Check my permissions!", ephemeral: true });
        });
      }

      const welcomeMessages = [
        `🎉 Welcome aboard, ${target}! We're so happy to have you here!`,
        `🌟 Cheers, ${target}! You've officially joined the community!`,
        `🎊 Hooray! ${target} is now part of the crew! Make yourself at home!`,
        `🚀 Welcome to the family, ${target}! Buckle up for an amazing journey!`,
        `✨ The wait is over! ${target} has officially arrived! Let's give them a warm welcome!`,
        `💫 Everyone, please welcome ${target} with open arms! We're glad you're here!`
      ];

      const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
      const welcomeEmojis = ["🎉", "🙌", "✨", "🥳", "🎶", "🎈", "💫"];
      const randomEmoji = welcomeEmojis[Math.floor(Math.random() * welcomeEmojis.length)];

      const welcomeChannel = interaction.guild.channels.cache.get(WELCOME_CHANNEL_ID);
      if (!welcomeChannel) return interaction.reply({ content: "The welcome channel could not be found.", ephemeral: true });

      // Create a button for users to click
      const welcomeButton = new ButtonBuilder()
        .setCustomId(`welcome_${target.id}`)
        .setLabel("Welcome!")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("👋"); // Main emoji (can be changed)

      const row = new ActionRowBuilder().addComponents(welcomeButton);

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("👀 A New Member Has Arrived!")
        .setDescription(randomMessage)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      const message = await welcomeChannel.send({ embeds: [embed], components: [row] });

      // Collect button interactions
      const filter = i => i.customId === `welcome_${target.id}` && !i.user.bot;
      const collector = message.createMessageComponentCollector({ filter, time: 7_200_000 });

      collector.on("collect", async i => {
        await i.reply({ content: `${i.user} welcomes ${target} with ${randomEmoji} ${randomEmoji}`, allowedMentions: { users: [] } });
      });

      await interaction.reply({ content: `Successfully welcomed ${target} ${newNickname ? `and set their nickname to "${newNickname}"` : ""}! 🎉`, ephemeral: false });

    } catch (error) {
      console.error(error);
      return interaction.reply({ content: "There was an error processing the command. Please check my permissions.", ephemeral: true });
    }
  },
};
