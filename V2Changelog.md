# New Features

- Multiple website support
  - All the infrastructure is in place the code for each website just needs to be written
- Branching Responses
  - Ever wondered why the bot played some sub-optimal move, its probably because it was just picking the first option it had. Now it will randomly choose allowing for you to try different branches
- Command improvements
  - Collection Add now has auto complete meaning its easier than ever to find just the right collection
  - Most commands have been cleaned up, making the bot more usable overall and especially for admins
    - There is still some work in this department to be done!
- Enhanced error handling, logging, and improved robustness
  - The bot should crash much less now
  - Logging still has a long way to go
- Easier Server On-boarding
  - With the improved commands comes some changes that should have been made long ago to make it more clear how to set up the bot on a server and what might be going wrong
  - Some fields that should have been required are now required removing some reported instances where the bot seems to be doing nothing
- Bot has been entirely rewritten in type script for better stability, readability, and extensibility
- And more!

# In-Depth

- Bot has been entirely rewritten in type script
  - This allows for better stability and readability
  - Major aspects have been rewritten to be faster and more extendable
    - More touched on later
- Bot has been moved from Node JS to Bun
  - Startup and module loading are now much faster
  - Environment variables are now stored in a .env instead of a config.json
- A provider registry system has been introduced
  - Each supported website is implemented as a provider behind a shared interface
  - Adding support for a new website is now a matter of implementing that interface rather than modifying core logic
  - All commands that reference a website route through the registry, meaning new providers are automatically available to autocomplete and all relevant commands
- Database changes
  - The database has multiple breaking changes
  - Moves now not only store player moves but also response moves in a SGF format
    - This allows support for response branching that is supported on all major websites
  - Collections are now stored with their source, type, name, and payload separately, allowing the bot to correctly handle collections across different websites
  - Puzzles in the queue follow a similar structure, pairing a puzzle ID with its source provider
- Bot has been moved to a new hosting platform allowing for easier issue detection and restarts if needed
