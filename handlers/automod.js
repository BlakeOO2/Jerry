// handlers/automod.js
const { PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config/automod.json');
let automodConfig = {
  whitelistedLinks: ['youtube.com', 'youtu.be', 'tiktok.com'],
  filteredWords: ['badword1', 'badword2'],
  spam: {
    interval: 5000, // ms
    maxMessages: 5,
    timeoutSeconds: 3600, // 1 hour
    alertChannelId: '1376937887664443432'
  }
};

// Load config if exists
if (fs.existsSync(configPath)) {
  automodConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} else {
  fs.writeFileSync(configPath, JSON.stringify(automodConfig, null, 2));
}

// In-memory spam tracking
const userMessageTimestamps = new Map();

function isWhitelistedLink(content) {
  const urlRegex = /https?:\/\/(\S+)/gi;
  let match;
  while ((match = urlRegex.exec(content))) {
    const url = match[1];
    if (automodConfig.whitelistedLinks.some(domain => url.includes(domain))) {
      continue;
    } else {
      return false;
    }
  }
  return true;
}

function containsFilteredWord(content) {
  return automodConfig.filteredWords.some(word =>
    content.toLowerCase().includes(word.toLowerCase())
  );
}

async function checkSpam(message) {
  const now = Date.now();
  const { interval, maxMessages, timeoutSeconds, alertChannelId } = automodConfig.spam;
  const key = `${message.guild.id}-${message.author.id}`;
  if (!userMessageTimestamps.has(key)) userMessageTimestamps.set(key, []);
  const timestamps = userMessageTimestamps.get(key);
  timestamps.push(now);
  // Remove old timestamps
  while (timestamps.length && now - timestamps[0] > interval) timestamps.shift();
  if (timestamps.length > maxMessages) {
    // Timeout user
    try {
      await message.member.timeout(timeoutSeconds * 1000, 'Spamming detected by automod');
    } catch {}
    // Alert channel
    const alertChannel = message.guild.channels.cache.get(alertChannelId);
    if (alertChannel) {
      alertChannel.send(`User <@${message.author.id}> was timed out for spamming.`);
    }
    return true;
  }
  return false;
}

module.exports = async function automod(client, message) {
  // Ignore bots
  if (message.author.bot) return;
  // Link filter
  if (/https?:\/\//i.test(message.content)) {
    if (!isWhitelistedLink(message.content)) {
      try { await message.delete(); } catch {}
      return;
    }
  }
  // Word filter
  if (containsFilteredWord(message.content)) {
    try { await message.delete(); } catch {}
    return;
  }
  // Spam filter
  await checkSpam(message);
};
