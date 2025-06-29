const Discord = require("discord.js");
const colors = require("colors");
const fs = require("fs");
const { Collection, GatewayIntentBits } = require("discord.js");
const db = require('./handlers/database.js');
const { startGitHubWebhookServer } = require('./handlers/githubWebhook');

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessageReactions,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    Discord.GatewayIntentBits.MessageContent,
  ],
  partials: ["MESSAGE", "CHANNEL", "REACTION", "USER", "GuildMember"],
});

// Add this line for invite tracking
client.invites = new Collection();

client.commands = new Collection();
client.aliases = new Collection();
client.slashCommands = new Collection();

["command", "events"].forEach((handler) => {
  require(`./handlers/${handler}`)(client);
});

client.once("ready", async () => {
  console.log(`${client.user.tag} is online!`);
  // Start GitHub webhook server
  startGitHubWebhookServer(client, 5028); // You can change the port if needed
  
  // Initialize invite cache for all guilds
  client.guilds.cache.forEach(async (guild) => {
    try {
      const firstInvites = await guild.invites.fetch();
      client.invites.set(guild.id, new Collection(firstInvites.map((invite) => [invite.code, invite.uses])));
    } catch (err) {
      console.error(`Error caching invites for guild ${guild.id}:`, err);
    }
  });

  await require("./handlers/slashcommands")(client);
});

client.login(require("./botconfig/config.json").token);