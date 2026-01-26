import { Client, Events, GatewayIntentBits, Message } from "discord.js";
import { resetUserActiveMoves,removeLastUserStone,getActivePuzzleID, getInProgessPuzzles } from "../database.js";
import { runAndSendBoard, puzzleSelectorMenu } from "../display.js";
import type { IGSBot } from "../IGSBot.js";

export default {
    name: Events.MessageCreate,
    intents: [GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent],
    once: false,
    async execute(message: Message) {
        
        const client: IGSBot = message.client as IGSBot;

        if (!message.guild) {
            if(message.author.id == "1313256722659541052")//this the bot
                return;

            // Handle DM logic here
            // console.log(`Received DM from ${message.author.tag}: ${message.content}`);
            if(message.content[0] == '!'){

                //make sure they have an active puzzles
                const puzzle = await getActivePuzzleID(client,message.author.id);
                if(puzzle == undefined || puzzle == null){

                    const inProgressPuzzles = await getInProgessPuzzles(client,message.author.id)
                    if(inProgressPuzzles.length > 1){
                        //set all puzzles to inactive so they can select with the puzzle selector menu
                        client.usersCol.updateMany({ 
                            "userId" : message.author.id,
                        }, { $set : {
                            "guilds.active" : 0
                        }});


                        await puzzleSelectorMenu(message,client,message.author.id,inProgressPuzzles);
                        return;
                    }else if(inProgressPuzzles.length == 0){
                        await message.reply("You have no in-progress puzzles, please go on a server and do /play to add one");
                        return;
                    }else if(inProgressPuzzles.length == 1){
                        await client.usersCol.updateOne({ 
                            "userId" : message.author.id,
                            "guilds.guildId" : message.guildId
                        }, { $set : {
                            "guilds.$.in_progress" : 1,
                            "guilds.$.active" : 1
                        }});
                    }
                }
                

                //move
                if(message.content.toUpperCase() === "!RESET"){
                    await resetUserActiveMoves(client,message.author.id);

                    runAndSendBoard(client,message.author.id);
                }else if(message.content.toUpperCase() === "!UNDO"){
                    await removeLastUserStone(client,message.author.id);

                    runAndSendBoard(client,message.author.id);
                }else{
                    runAndSendBoard(client,message.author.id,message.content.trim().slice(1));
                }
            }
        }
    }
};