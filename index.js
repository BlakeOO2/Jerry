// Importing necessary modules
const Discord = require("discord.js");
const colors = require("colors");
const fs = require("fs");
const { Collection, GatewayIntentBits } = require("discord.js");
const db = require('./handlers/database.js');


// Creating the Discord.js Client with necessary options
const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    Discord.GatewayIntentBits.MessageContent,  // Add this

  ],
  partials: ["MESSAGE", "CHANNEL", "REACTION", "USER", "GuildMember"],
});

// Setting up collections for commands
client.commands = new Collection();
client.aliases = new Collection();
client.slashCommands = new Collection(); // Add collection for slash commands

// Loading command and event handlers
["command", "events"].forEach((handler) => {
  require(`./handlers/${handler}`)(client);
});

// Loading the slash command handler
client.once("ready", async () => {
  console.log(`${client.user.tag} is online!`);
  await require("./handlers/slashcommands")(client); // Run slash commands setup after bot is ready
});


// Logging into the bot
client.login(require("./botconfig/config.json").token);
