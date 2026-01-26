import type { IGSBot } from '../IGSBot.js';
import { Events } from 'discord.js';

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client: IGSBot){
        console.log(`Ready! Logged in as ${client.user?.tag}`);
    },
};