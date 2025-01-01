# Origami Points Discord Bot

A Discord bot that tracks and displays user points statistics for Origami Protocol. The bot caches data in PostgreSQL and updates daily to reduce API load and provide fast responses.

## Features

- Real-time points statistics lookup
- Friendly vault name display
- Season 1 & 2 point tracking
- Rank tracking with points needed for next rank
- Longest streak tracking
- Vault usage statistics
- Data caching with PostgreSQL for fast responses
- Daily automatic data sync (2 AM CET)
- Admin command for manual sync

## Commands

- `!stats <address>` - Get points statistics for an Ethereum address
- `!syncnow` - (Admin only) Force an immediate data sync
- `!ping` - Test bot connectivity

## Example Output
<img width="500" alt="image" src="https://github.com/user-attachments/assets/edfb6762-a33d-437c-a02a-0d8d76e3d3f9" />


## Technical Details

### Prerequisites
- Node.js v18+
- PostgreSQL database (Heroku PostgreSQL Essential-0 plan or higher)
- Discord Bot Token
- Heroku account

### Environment Variables
```env
DISCORD_TOKEN=your_discord_bot_token
DATABASE_URL=your_postgresql_connection_string
```

### Installation & Local Development
```bash
# Clone the repository
git clone https://github.com/unhappyben/origami-discord-bot.git

# Install dependencies
cd origami-discord-bot
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start the bot
npm start
```

### Deployment to Heroku

1. Create a new Heroku app:
```bash
heroku create origami-discord-bot
```

2. Add PostgreSQL:
```bash
heroku addons:create heroku-postgresql:essential-0
```

3. Configure environment variables:
```bash
heroku config:set DISCORD_TOKEN=your_discord_bot_token
```

4. Deploy:
```bash
git push heroku main
```

5. Scale worker dyno (and ensure no web dyno is running):
```bash
heroku ps:scale worker=1 web=0
```

### Database Schema
The bot uses a PostgreSQL database with the following schema:
```sql
CREATE TABLE points_data (
    holder_address TEXT PRIMARY KEY,
    total_points DECIMAL,
    season1_points DECIMAL,
    season2_points DECIMAL,
    rank INTEGER,
    points_to_next_rank DECIMAL,
    longest_streak INTEGER,
    unique_vault_count INTEGER,
    top_vault TEXT,
    top_vault_points DECIMAL,
    last_updated TIMESTAMP WITH TIME ZONE
)
```

## Dependencies
- discord.js
- node-cron
- pg (PostgreSQL client)
- dotenv
- lodash
- node-fetch

## Contributing
Feel free to submit issues and enhancement requests!

## License
MIT License

## Support
For support, please join the [Origami Discord](https://discord.gg/origami)
