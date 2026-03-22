# IGS Puzzle Bot

A Discord bot for serving Go puzzles to your server. Pull puzzles from supported providers, build a queue, schedule automatic advancement, and let your community compete on the leaderboard — all via slash commands.

---

## Requirements

- [Bun](https://bun.sh/) v1.0+
- A Discord bot application and token
- A [MongoDB](https://www.mongodb.com/) instance (local or Atlas)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/Skwidder/IGS-Puzzle-Bot
cd IGS-Puzzle-Bot
bun install
```

### 2. Configure environment

Create a `.env` file in the root of the project:

```env
DISCORD_TOKEN=your_bot_token_here
DBCONNSTRING=your_mongodb_connection_string_here
```

The bot connects to a MongoDB database named `Puzzle_Bot` and creates two collections automatically: `servers` and `users`.

### 3. Register slash commands

```bash
bun deploy-commands.ts
```

### 4. Start the bot

```bash
# Production
bun start
```

---

## Bot Permissions

The bot requires the following Discord Gateway Intents:

- `Guilds`
- `DirectMessages`
- `MessageContent`
- `GuildMembers`

Make sure these are enabled in your application's Discord Developer Portal.

---

## Playing a Puzzle

Once a puzzle is active, members interact with it **via DM**:

| Command | Description |
|---------|-------------|
| `!<location>` | Play a move (e.g. `!B17`, `!Q3`) |
| `!reset` | Reset the puzzle back to its starting position |
| `!undo` | Undo your last move |

The bot responds with a rendered board image showing the current position, move result, and source info.

If you have puzzles in progress on multiple servers, the bot will send a selection menu so you can choose which one to play.

---

## Commands

### 🎯 `/play`
Sends the current active puzzle to you via DM. Creates your user account automatically if this is your first time. Guild only.

---

### 📢 `/announce_puzzle`
Posts the current active puzzle in a channel, with an optional role ping. Generates a board image with starting marks.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `channel` | Channel | ✅ | Channel to post the announcement to |
| `role` | Role | ❌ | Role to ping in the announcement |

> Requires **Administrator** or **Moderate Members** permission.

---

### 🧩 `/puzzle`
Full control over the puzzle queue.

#### `/puzzle add`
Validates and adds a specific puzzle to the queue by ID.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `website` | String | ✅ | Provider to pull from (autocomplete) |
| `id` | String | ✅ | Puzzle ID on that website |
| `position` | Choice | ❌ | `Next` (front of queue) or `Last` (default) |

#### `/puzzle remove`
Remove a puzzle from the queue.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `remove` | String | ✅ | Puzzle to remove (autocomplete) |

#### `/puzzle next`
Advance to the next puzzle in the queue, removing the current one. If the queue is empty, a puzzle is drawn randomly from an approved collection. Follow up with `/announce_puzzle` to post it.

> Requires **Administrator** or **Moderate Members** permission.

---

### 📚 `/collection`
Manage approved puzzle collections. When the puzzle queue runs dry, the bot automatically picks a random puzzle from one of these.

#### `/collection add`
Add a collection from a supported provider. Uses autocomplete to search and validate the collection before adding it.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `website` | String | ✅ | Provider (autocomplete) |
| `search` | String | ✅ | Collection name, ID, or search string (autocomplete) |

#### `/collection remove`
Remove a collection from the approved list.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `remove` | String | ✅ | Collection to remove (autocomplete) |

> Requires **Administrator** permission.

---

### 🏆 `/leaderboard`
Displays the server's puzzle leaderboard. Scores are based on puzzles solved correctly.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `numresults` | Integer | ❌ | Number of players to show (default: 10) |

---

### 🗓️ `/schedule_puzzle`
Configure automatic puzzle advancement on a recurring schedule. On each trigger, the bot advances to the next puzzle and posts an announcement.

#### `/schedule_puzzle daily`
Advances every day at midnight (`0 0 * * *`).

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `channel` | Channel | ✅ | Channel for the announcement |
| `role` | Role | ❌ | Role to ping |

#### `/schedule_puzzle weekly`
Advances every Sunday at midnight (`0 0 * * 0`).

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `channel` | Channel | ✅ | Channel for the announcement |
| `role` | Role | ❌ | Role to ping |

#### `/schedule_puzzle custom`
Set any schedule using a cron expression.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `cron` | String | ✅ | Valid cron expression (e.g. `0 9 * * 1` for Monday 9am) |
| `channel` | Channel | ✅ | Channel for the announcement |
| `role` | Role | ❌ | Role to ping |

#### `/schedule_puzzle off`
Cancels the active schedule.

> Requires **Administrator** permission. Schedules survive bot restarts — they are persisted to MongoDB and restored on startup.

---

### 🔁 `/reset_leaderboard`
Resets all current scores to zero. Players who have already solved the active puzzle retain 1 point. All-time scores are never affected.

> Requires **Administrator** permission.

---

## Permissions Summary

| Command | Required Permission |
|---------|-------------------|
| `/play` | Everyone |
| `/leaderboard` | Everyone |
| `/announce_puzzle` | Administrator or Moderate Members |
| `/puzzle` | Administrator or Moderate Members |
| `/collection` | Administrator |
| `/schedule_puzzle` | Administrator |
| `/reset_leaderboard` | Administrator |

---

## Puzzle Flow

1. **Add content** — use `/puzzle add` for specific puzzles, or `/collection add` to approve a collection as an automatic source
2. **Advance** — use `/puzzle next` to load the next puzzle (draws from the queue first, then falls back to a random approved collection)
3. **Announce** — use `/announce_puzzle` to post it to a channel, or let `/schedule_puzzle` handle steps 2 and 3 automatically on a recurring schedule
4. **Play** — members use `/play` to receive the board in their DMs, then respond with moves like `!B17`
5. **Track progress** — check standings at any time with `/leaderboard`


## Issues & Contributing

Found a bug or have a feature request? Open an issue on [GitHub](https://github.com/Skwidder/IGS-Puzzle-Bot/issues).

## Support Me

Support this project and others like it on Ko-Fi: https://ko-fi.com/skwidder
