import { Client, Events, GatewayIntentBits, Message } from "discord.js";
import type { IGSBot } from "../IGSBot.js";
import { userMessageHandle } from "../PlayerManager.js";

export default {
    name: Events.MessageCreate,
    intents: [GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent],
    once: false,
    async execute(message: Message) {
        
        const client: IGSBot = message.client as IGSBot;

        if (!message.guild) {
            if(message.author.id === (client.user?.id ?? ""))//this the bot
                return;

            userMessageHandle(message);
        }
    }
};