import { Client, Events, Guild } from "discord.js";
import { IGSBot } from "../IGSBot";
import { createDBServer, getServer } from "../databaseManager";

export default {
    name: Events.GuildCreate,
    once: false,
    async execute(guild: Guild){
        console.log(`Bot joined a new server: ${guild.name} (ID: ${guild.id})`);
        
        const client : IGSBot = guild.client as IGSBot;

        //check just incase we dont want to override anything
        const existingServer = await getServer(client, guild.id);

        if (!existingServer) {
            createDBServer(client, guild.id, guild.name);
        }
    }
}
