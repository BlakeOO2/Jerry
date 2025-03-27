const { Events } = require("discord.js");

module.exports = (client, member) => {
  const roleId = "1353311577448644638"; // Nodmad Role 

  const role = member.guild.roles.cache.get(roleId);
  if (!role) {
    console.error("❌ Role not found!");
    return;
  }

  member.roles.add(role)
    .then(() => console.log(`✅ Assigned role "${role.name}" to ${member.user.tag}`))
    .catch(error => console.error(`❌ Failed to assign role to ${member.user.tag}:`, error));
};
