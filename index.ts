import fs from 'fs';
import path from 'path';
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { IGSBot } from './IGSBot';
//const { discord_token } = require('./config.json');
//^^ should be able to remove and use .env

const igsbot: IGSBot = new IGSBot();
await igsbot.start();

igsbot.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			igsbot.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		igsbot.once(event.name, (...args) => event.execute(...args));
	} else {
		igsbot.on(event.name, (...args) => event.execute(...args));
	}
}

