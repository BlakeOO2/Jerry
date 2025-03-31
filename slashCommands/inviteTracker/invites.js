const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getInvites } = require('../../handlers/database.js'); // Adjust path as needed

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Check your or another user\'s invites')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to check invites for')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const inviteData = await getInvites(targetUser.id);

            const embed = new EmbedBuilder()
                .setColor('#2f3136')
                .setTitle(`Invite Stats for ${targetUser.tag}`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { 
                        name: 'Total Invites', 
                        value: `${inviteData.totalInvites || 0}`, 
                        inline: false 
                    },
                    { 
                        name: 'Regular', 
                        value: `${inviteData.regularInvites || 0}`, 
                        inline: true 
                    },
                    { 
                        name: 'Left', 
                        value: `${inviteData.leftInvites || 0}`, 
                        inline: true 
                    },
                    { 
                        name: 'Fake', 
                        value: `${inviteData.fakeInvites || 0}`, 
                        inline: true 
                    },
                    { 
                        name: 'Bonus', 
                        value: `${inviteData.bonusInvites || 0}`, 
                        inline: true 
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${interaction.user.tag}`, 
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in invites command:', error);
            await interaction.reply({
                content: 'There was an error while fetching the invite data!',
                ephemeral: true
            });
        }
    }
};
