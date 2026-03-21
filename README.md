# IGS Puzzle Bot

A Discord bot for practicing Go (Baduk/Weiqi) puzzles from the Online Go Server (OGS). This bot helps server administrators manage and share Go puzzles with their community members, tracks user progress, and maintains a leaderboard.

# Adding It To A Server

If you would like to add the bot to your server, I (skwidder or dontdiehard on discord), am hosting it and you can use this link to add it https://discord.com/oauth2/authorize?client_id=1313256722659541052

or feel free to self host.

## Usage

### Admin Commands

- `/add_puzzle [id] [position]` - Add an OGS puzzle to the server queue
- `/announce_puzzle [channel] [role?]` - Announce the current puzzle in a specific channel
- `/next_puzzle` - Move to the next puzzle in the queue
- `/collection add [Collection Name]` - Adds a puzzle collection to the approved collection list. This list will be used to randomly get a puzzle if the puzzle queue is empty
- `/collection remove [Collection Name]` - Removes a puzzle collection from the approved collection list.
- `/collection list [Collection Name]` - Lists all approved collections
- `/leaderboard reset` - Resets the leaderboard

# Scheduling Puzzles

The bot supports automatic puzzle advancement with optional announcements. Server administrators can set up schedules in several ways using the `/schedule_puzzle` command.

## Basic Usage

### Daily Scheduling

Schedule puzzles to advance every day at midnight:

```
/schedule_puzzle daily
  [channel:#puzzles]  Optional: Channel to announce new puzzles
  [role:@puzzlers]    Optional: Role to ping for announcements
```

### Weekly Scheduling

Schedule puzzles to advance every Sunday at midnight:

```
/schedule_puzzle weekly
  [channel:#puzzles]  Optional: Channel to announce new puzzles
  [role:@puzzlers]    Optional: Role to ping for announcements
```

### Custom Scheduling

Set a custom schedule using cron expression:

```
/schedule_puzzle custom
  cron:"0 0 * * *"   Required: Cron expression for scheduling
  [channel:#puzzles]  Optional: Channel to announce new puzzles
  [role:@puzzlers]    Optional: Role to ping for announcements
```

### Turn Off Scheduling

```
/schedule_puzzle off
```

## Cron Expression Guide

For custom scheduling, you'll need to provide a cron expression. Here's the format:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of the month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of the week (0 - 6) (Sunday=0)
│ │ │ │ │
* * * * *
```

Common Examples:

- `0 0 * * *` - Every day at midnight
- `0 12 * * *` - Every day at noon
- `0 0 * * 0` - Every Sunday at midnight
- `0 8 * * 1-5` - Every weekday at 8 AM
- `0 */6 * * *` - Every 6 hours

## Puzzle Queue Behavior

When a scheduled advancement occurs:

1. If there are puzzles in the queue, the bot will move to the next puzzle
2. If the queue is empty or has only one puzzle remaining, the bot will:
   - Check approved puzzle collections
   - Randomly select a new puzzle from these collections
   - Add it to the queue
   - Move to the new puzzle

## Announcements

Announcements are optional. You can:

- Schedule without announcements by not specifying a channel
- Schedule with announcements by specifying a channel
- Schedule with announcements and role pings by specifying both channel and role

The announcement will include:

- The new puzzle details
- Visual representation of the puzzle
- Role ping (if configured)

### User Commands

- `/play` - Start solving the current puzzle
- `/show_puzzle [id]` - Display information about a specific puzzle
- `/leaderboard` - View the server's puzzle solving leaderboard

### Puzzle Solving Commands (DM)

- `![coordinate]` - Make a move (e.g., `!Q4`)
- `!reset` - Reset the current puzzle
- `!undo` - Undo your last move

## Setup

1. Clone the repository

```bash
git clone https://github.com/Skwidder/IGS-Puzzle-Bot.git
```

2. Install dependencies

```bash
npm install
```

3. Set up prerequisites:
   - For help creating a Discord bot and getting your token and client ID, follow the [Discord.js Guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html)
   - For help setting up MongoDB Atlas, follow the [MongoDB Atlas Tutorial](https://www.mongodb.com/resources/products/platform/mongodb-atlas-tutorial)

4. Create a `config.json` file with your credentials:

```json
{
  "discord_token": "your-discord-token",
  "discord_clientId": "your-client-id",
  "discord_guildId": "your-guild-id",
  "dbConnString": "your-mongodb-conn-string"
}
```

5. Deploy commands

```bash
node deploy-commands.js
```

6. Start the bot

```bash
node index.js
```

## Technical Requirements

- Node.js 18.17.0 or higher
- MongoDB database
- Discord bot token and application
- Dependencies:
  - discord.js
  - mongodb
  - sharp
  - axios
  - wgo

## Development

This bot uses:

- Discord.js for bot functionality
- MongoDB for data persistence
- Sharp for image processing
- WGO.js for Go game logic
- SVG for board rendering

## License

MIT License

## Author

Skwidder

## Contributing

1. Fork the repository
2. Create a new branch for your feature
3. Submit a pull request

## Support

For issues and feature requests, please use the GitHub issues page.

## Support Me

Support this project and others like it on Ko-Fi: https://ko-fi.com/skwidder
