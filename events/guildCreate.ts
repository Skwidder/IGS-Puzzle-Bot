import { Client, Events, Guild } from "discord.js";
import { IGSBot } from "../IGSBot";

export default {
    name: Events.GuildCreate,
    once: false,
    async execute(guild: Guild){
        console.log(`Bot joined a new server: ${guild.name} (ID: ${guild.id})`);
        
        const client : IGSBot = guild.client as IGSBot;

        //check just incase we dont want to override anything
        const existingServer = await client.serverCol.findOne({ serverId: guild.id });

        if (!existingServer) {
            await client.serverCol.insertOne({
                'serverId' : guild.id,
                'name' : guild.name,  
                'puzzle_queue' : [],
                'approved_collections': []
            });
        }
    }
}
