const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

const ASHES_ID = "USER_ID_ASHES"; // Replace with actual ID
const BLAKE_ID = "USER_ID_BLAKE"; // Replace with actual ID

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tos")
    .setDescription("Sends the Terms of Service message with Accept/Deny buttons.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles), // Requires Manage Roles permission

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("⚠️ Server Terms of Service")
      .setDescription(
        "❗️ We have a **no stealing or griefing** policy. \n\n We can and will **permanently ban** any violators from Minecraft **and** their specific gaming platform.\n\n" +
        "People spend so much effort making beautiful builds here, and **we don’t fck around**.\n\n" +
        "Our community will always treat you right if you match the energy 🫶\n\n" +
        "Also, we can check stats, so false accusations won't fly. :p\n\n" +
        "**Do you understand and agree to these terms?**"
      );

    const acceptButton = new ButtonBuilder()
      .setCustomId("tos_accept")
      .setLabel("Accept ✅")
      .setStyle(ButtonStyle.Success);

    const denyButton = new ButtonBuilder()
      .setCustomId("tos_deny")
      .setLabel("Deny ❌")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(acceptButton, denyButton);

    const message = await interaction.channel.send({ embeds: [embed], components: [row] });

    // Collect button interactions (No timeout)
    const collector = message.createMessageComponentCollector();

    collector.on("collect", async i => {
      if (i.customId === "tos_accept") {
        await i.reply({ 
          content: `${i.user} has **accepted** the Terms of Service ✅`, 
          allowedMentions: { users: [] } 
        });

        await interaction.channel.send({
          content: `${i.user}, whenever you get on the game and are ready to join the realm, DM <@${"1216196243697565731"}> on here, and they will generate you a realm code that expires in two minutes.\n\n` +
          `After you’re in, ask **<@${"1216196243697565731"}>, <@${"479720473941245962"}>, <@${"1345624006895599676"}>, or <@${"1335382482593513489"}>** for a tour around and keep your eyes open for land you like. Any unfenced/unmarked land is free to claim, but do mark your land because we tell everyone the same :p\n\n` +
          "Please build your first house close to everyone, but after that, build wherever you want.\n\n" +
          `DM <@${"1216196243697565731"}> or <@${"479720473941245962"}> if you need anything at all.\n\n` +
          "**Please follow the rules and be nice to everyone.**\n\n" +
          "Some people talk sh* and some people don’t, just know your audience and be respectful.\n\n" +
          "Have fun!! We can’t wait to see your builds around :p"
        });
      } else if (i.customId === "tos_deny") {
        await i.reply({ 
          content: `${i.user} has **denied** the Terms of Service ❌`, 
          allowedMentions: { users: [] } 
        });
      }
    });

    await interaction.deferReply({ ephemeral: true });
    await interaction.deleteReply(); // Remove the interaction reply to keep the channel clean
  },
};
