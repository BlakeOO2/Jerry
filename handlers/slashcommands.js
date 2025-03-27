const { readdirSync } = require("fs");
const { REST, Routes } = require("discord.js");
const ascii = require("ascii-table");
const config = require("../botconfig/config.json"); // Load token from config.json

let table = new ascii("Slash Commands");
table.setHeading("Command", "Load status");

module.exports = async (client) => {
  try {
    const slashCommands = [];

    readdirSync("./slashCommands/").forEach((dir) => {
      const commands = readdirSync(`./slashCommands/${dir}/`).filter((file) => file.endsWith(".js"));

      for (let file of commands) {
        let command = require(`../slashCommands/${dir}/${file}`);

        if (command.data && command.data.name) {
          client.slashCommands.set(command.data.name, command);
          slashCommands.push(command.data.toJSON());
          table.addRow(file, "Loaded");
        } else {
          table.addRow(file, "Error: Missing command name or structure.");
          continue;
        }
      }
    });

    console.log(table.toString().cyan);

    // **Create REST instance with the bot's token**
    const rest = new REST({ version: "10" }).setToken(config.token);

    // **Register slash commands**
    client.guilds.cache.forEach(async (guild) => {
  await rest.put(
    Routes.applicationGuildCommands(client.user.id, guild.id),
    { body: slashCommands }
  );
  console.log(`✅ Registered slash commands for ${guild.name} (${guild.id})`);
});


    console.log("✅ Successfully registered slash commands.");
  } catch (e) {
    console.log(`❌ Error loading slash commands: ${e}`.red);
  }
};
