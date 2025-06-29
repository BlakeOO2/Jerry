// handlers/githubWebhook.js
const express = require('express');
const bodyParser = require('body-parser');
const { listChannelSubscriptions } = require('./database');
const { EmbedBuilder } = require('discord.js');

// You must call this with your Discord client instance after login
function startGitHubWebhookServer(client, port = 5028) {
  const app = express();
  app.use(bodyParser.json());

  app.post('/github/:repo', async (req, res) => {
    const repo = req.params.repo; // owner/repo
    const event = req.headers['x-github-event'];
    const payload = req.body;
    // Find all channels subscribed to this repo
    // (Assume all guilds, so you may want to filter by guild if needed)
    const allGuilds = client.guilds.cache;
    for (const [guildId, guild] of allGuilds) {
      for (const channel of guild.channels.cache.values()) {
        if (!channel.isTextBased?.() || !channel.permissionsFor(guild.members.me).has('SendMessages')) continue;
        try {
          const subs = await listChannelSubscriptions(channel.id);
          if (subs.some(s => s.repo === repo && s.enabled)) {
            // Build a simple embed for the event
            const embed = buildGitHubEmbed(event, payload, repo);
            if (embed) await channel.send({ embeds: [embed] });
          }
        } catch {}
      }
    }
    res.status(200).send('OK');
  });

  app.listen(port, () => {
    console.log(`[GitHub Webhook] Listening on port ${port}`);
  });
}

function buildGitHubEmbed(event, payload, repo) {
  const embed = new EmbedBuilder().setColor(0x24292e).setFooter({ text: repo });
  if (event === 'push') {
    embed.setTitle(`Push to ${repo}`)
      .setDescription(`${payload.pusher.name} pushed ${payload.commits.length} commit(s) to ${payload.ref.replace('refs/heads/', '')}`)
      .addFields(payload.commits.slice(0, 5).map(c => ({ name: c.message, value: `[View Commit](${c.url})`, inline: false })))
      .setURL(payload.compare);
  } else if (event === 'issues') {
    embed.setTitle(`Issue ${payload.action} in ${repo}`)
      .setDescription(`#${payload.issue.number}: ${payload.issue.title}`)
      .setURL(payload.issue.html_url);
  } else if (event === 'issue_comment') {
    embed.setTitle(`New comment on issue #${payload.issue.number} in ${repo}`)
      .setDescription(payload.comment.body)
      .setURL(payload.comment.html_url);
  } else if (event === 'release') {
    embed.setTitle(`Release ${payload.action} in ${repo}`)
      .setDescription(payload.release.name || payload.release.tag_name)
      .setURL(payload.release.html_url);
  } else {
    embed.setTitle(`GitHub event: ${event}`)
      .setDescription('A new event occurred.');
  }
  return embed;
}

module.exports = { startGitHubWebhookServer };
