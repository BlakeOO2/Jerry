const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tos")
        .setDescription("Sends the Terms of Service message with Accept/Deny buttons.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("⚠️ Server Terms of Service")
                .setDescription(
                    "❗️ We have a **no stealing or griefing** policy. \n\n We can and will **permanently ban** any violators from Minecraft **and** their specific gaming platform.\n\n" +
                    "People spend so much effort making beautiful builds here, and **we don't fck around**.\n\n" +
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

            // Send the message to the channel
            const message = await interaction.channel.send({ embeds: [embed], components: [row] });

            // Collect button interactions
            const collector = message.createMessageComponentCollector();

            collector.on("collect", async i => {
                if (i.customId === "tos_accept") {
                    await i.reply({
                        content: `${i.user} has **accepted** the Terms of Service ✅\n The Application team will be with you shortly to review your application.`,
                        allowedMentions: { users: [] }
                    });

                    
                } else if (i.customId === "tos_deny") {
                    await i.reply({
                        content: `${i.user} has **denied** the Terms of Service ❌`,
                        allowedMentions: { users: [] }
                    });
                }
            });

            // Handle the original interaction differently based on whether it's a regular slash command
            // or a followup command in a ticket
            if (interaction.deferReply) {
                try {
                    await interaction.deferReply({ ephemeral: true });
                    if (interaction.deleteReply) {
                        await interaction.deleteReply();
                    }
                } catch (error) {
                    console.error('Error handling interaction reply:', error);
                }
            }
        } catch (error) {
            console.error('Error in TOS command:', error);
            await interaction.channel.send('There was an error displaying the Terms of Service.');
        }
    },
};
