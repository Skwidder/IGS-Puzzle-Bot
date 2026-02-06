import { Client, Events, GatewayIntentBits, Message } from "discord.js";
import { resetUserActiveMoves,removeLastUserStone,getActivePuzzleID, getInProgessPuzzles } from "../database.js";
import { runAndSendBoard, puzzleSelectorMenu } from "../display.js";
import type { IGSBot } from "../IGSBot.js";
import { userMessageHandle } from "../PlayerManager.js";

export default {
    name: Events.MessageCreate,
    intents: [GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent],
    once: false,
    async execute(message: Message) {
        
        const client: IGSBot = message.client as IGSBot;

        if (!message.guild) {
            if(message.author.id == "1313256722659541052")//this the bot
                return;

        userMessageHandle(message);
        }
    }
};