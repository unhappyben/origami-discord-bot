require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const _ = require('lodash');
const db = require('./db');
const sync = require('./sync');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2
    }).format(num);
  };
  
  client.on('ready', async () => {
    try {
        console.log('Initializing database...');
        await db.initDatabase();
        console.log('Database initialized');
        
        console.log(`Logged in as ${client.user.tag}!`);
        console.log('Bot is ready!');
        
        // Now that database is initialized, start the sync
        await sync.forceSyncNow();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});
  
  client.on('error', error => {
    console.error('Discord client error:', error);
  });
  
  client.on('messageCreate', async message => {
    console.log('Message received:', {
      content: message.content,
      author: message.author.tag,
      bot: message.author.bot,
      channel: message.channel.name
    });
  
    // Test command
    if (message.content === '!ping') {
      console.log('Ping command received');
      message.reply('pong!');
      return;
    }
  
    // Ignore messages from bots
    if (message.author.bot) {
      console.log('Ignoring bot message');
      return;
    }
  
    try {
      if (message.content.startsWith('!stats')) {
        console.log('Stats command detected');
  
        const args = message.content.split(' ');
        if (args.length !== 2) {
          console.log('Invalid command format');
          message.reply('Please use the format: !stats <address>');
          return;
        }
  
        const address = args[1];
        console.log('Processing address:', address);
        
        try {
          // Get stats from cache
          const stats = await db.getStats(address);
          
          if (!stats) {
            console.log('No stats found for address');
            message.reply('No data found for this address.');
            return;
          }
  
          // Get cache age
          const lastUpdate = await db.getLastUpdateTime();
          const cacheAge = Math.floor((Date.now() - new Date(lastUpdate)) / (1000 * 60)); // in minutes
  
          console.log('Creating embed with stats');
          const embed = new EmbedBuilder()
            .setColor('#1e40af')
            .setTitle('Origami Points Stats')
            .setDescription(`Stats for ${address.slice(0, 6)}...${address.slice(-4)}`)
            .addFields([
              {
                name: '📊 Rank',
                value: `#${stats.rank}${stats.points_to_next_rank > 0 ? 
                  ` | +${formatNumber(stats.points_to_next_rank)} points until next rank` : 
                  ''}`,
                inline: false
              },
              {
                name: '💎 Total Points',
                value: formatNumber(stats.total_points),
                inline: true
              },
              {
                name: '🎖️ Season 1',
                value: formatNumber(stats.season1_points),
                inline: true
              },
              {
                name: '🏆 Season 2',
                value: formatNumber(stats.season2_points),
                inline: true
              },
              {
                name: '🔥 Longest Streak',
                value: `${stats.longest_streak} days`,
                inline: true
              },
              {
                name: '🏦 Unique Vaults',
                value: stats.unique_vault_count.toString(),
                inline: true
              },
              {
                name: '⭐ Top Vault',
                value: `${stats.top_vault}\n${formatNumber(stats.top_vault_points)} points`,
                inline: true
              }
            ])
            .setFooter({ text: `Cache age: ${cacheAge} minutes` })
            .setTimestamp();
  
          console.log('Sending response');
          await message.reply({ embeds: [embed] });
          console.log('Response sent successfully');
        } catch (error) {
          console.error('Error processing stats:', error);
          message.reply('An error occurred while fetching the stats. Please try again later.');
        }
      }
  
      // Add a command to force sync (admin only)
      if (message.content === '!syncnow' && message.member.permissions.has('ADMINISTRATOR')) {
        message.reply('Starting manual sync...');
        await sync.forceSyncNow();
        message.reply('Sync completed!');
      }
    } catch (error) {
      console.error('Error in messageCreate handler:', error);
      message.reply('An error occurred while processing your request.').catch(console.error);
    }
  });
  
  // Use environment variable for bot token
  client.login(process.env.DISCORD_TOKEN).catch(console.error);