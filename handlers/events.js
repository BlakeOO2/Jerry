const fs = require("fs");
const ascii = require("ascii-table");
let table = new ascii("Events");
table.setHeading("Events", "Load status");
const allevents = [];

module.exports = async (client) => {
  try {
    const load_dir = (dir) => {
      const event_files = fs.readdirSync(`./events/${dir}`).filter((file) => file.endsWith(".js"));
      for (const file of event_files) {
        const event = require(`../events/${dir}/${file}`);
        let eventName = file.split(".")[0];

        if (typeof event !== "function") {
          console.error(`❌ Event "${eventName}" does not export a valid function.`);
          table.addRow(eventName, "❌ Error");
          continue;
        }

        allevents.push(eventName);
        client.on(eventName, event.bind(null, client));
      }
    };

    await ["client", "guild"].forEach((e) => load_dir(e));

    // // Add interactionCreate event for handling slash commands
    // client.on("interactionCreate", async (interaction) => {
    //   if (!interaction.isCommand()) return;

    //   const command = client.slashCommands.get(interaction.commandName);
    //   if (!command) return;

    //   try {
    //     await command.execute(interaction);
    //   } catch (error) {
    //     console.error(error);
    //     await interaction.reply({ content: "There was an error executing this command.", ephemeral: true });
    //   }
    // });

    // allevents.push("interactionCreate"); // Log the interaction event

    for (let i = 0; i < allevents.length; i++) {
      try {
        table.addRow(allevents[i], "Ready");
      } catch (e) {
        console.log(String(e.stack).red);
      }
    }
    console.log(table.toString().cyan);

    // Welcome Message
    try {
      const stringlength = 69;
      console.log("\n");
      console.log(`     ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓`.bold.brightGreen);
      console.log(`     ┃ `.bold.brightGreen + " ".repeat(-1 + stringlength - ` ┃ `.length) + "┃".bold.brightGreen);
      console.log(`     ┃ `.bold.brightGreen + `Welcome to SERVICE HANDLER!`.bold.brightGreen + " ".repeat(-1 + stringlength - ` ┃ `.length - `Welcome to SERVICE HANDLER!`.length) + "┃".bold.brightGreen);
      console.log(`     ┃ `.bold.brightGreen + `  /-/ By https://milrato.eu /-/`.bold.brightGreen + " ".repeat(-1 + stringlength - ` ┃ `.length - `  /-/ By https://milrato.eu /-/`.length) + "┃".bold.brightGreen);
      console.log(`     ┃ `.bold.brightGreen + " ".repeat(-1 + stringlength - ` ┃ `.length) + "┃".bold.brightGreen);
      console.log(`     ┃ `.bold.brightGreen + `  /-/ Discord: Tomato#6966 /-/`.bold.brightGreen + " ".repeat(-1 + stringlength - ` ┃ `.length - `  /-/ By Discord: Tomato#6966 /-/`.length) + "   ┃".bold.brightGreen);
      console.log(`     ┃ `.bold.brightGreen + " ".repeat(-1 + stringlength - ` ┃ `.length) + "┃".bold.brightGreen);
      console.log(`     ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`.bold.brightGreen);
    } catch { /* */ }

    // Logging Message
    try {
      const stringlength2 = 69;
      console.log("\n");
      console.log(`     ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓`.bold.yellow);
      console.log(`     ┃ `.bold.yellow + " ".repeat(-1 + stringlength2 - ` ┃ `.length) + "┃".bold.yellow);
      console.log(`     ┃ `.bold.yellow + `Logging into the BOT...`.bold.yellow + " ".repeat(-1 + stringlength2 - ` ┃ `.length - `Logging into the BOT...`.length) + "┃".bold.yellow);
      console.log(`     ┃ `.bold.yellow + " ".repeat(-1 + stringlength2 - ` ┃ `.length) + "┃".bold.yellow);
      console.log(`     ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`.bold.yellow);
    } catch { /* */ }

  } catch (e) {
    console.log(String(e.stack).bgRed);
  }
};
