import { Client, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { advanceToNextPuzzle } from "../../ServerManager";
import type { IGSBot } from "../../IGSBot";
import { interactionReply } from "../../discordManager";

const data = new SlashCommandBuilder()
    .setName('next_puzzle')
    .setDescription('Move the server to next puzzle in the queue. This will remove the current puzzle')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ModerateMembers)
    .setContexts(InteractionContextType.Guild)

async function execute(interaction: ChatInputCommandInteraction) {
    if(!interaction.guildId) throw Error("/next_puzzle not in server?");

    const response = await advanceToNextPuzzle(interaction.client as IGSBot, interaction.guildId);

    if(response.success === true){
        interactionReply(interaction, "Moved to next puzzle, do /announce_puzzle to show it", undefined, true);
        return
    }

    switch(response.errorType){
        case "EMPTY_QUEUE":
            interactionReply(interaction, "No puzzles in queue using approved collection instead!");
            return;
        case "COLLECTION_NOT_FOUND":
            interactionReply(interaction, "Collection not found it could have went private, check your collections");
            return;
        case "NO_COLLECTIONS":
            interactionReply(interaction, "No puzzles in queue and no approved collections, please add a puzzle with" +
                "/add_puzzle or add a collection with /collection add");
            return;
        case "DB_ERROR":
            throw Error("DB Error on next puzzle");
            return;
        case "SERVER_NOT_FOUND":
            console.log(`Server not found ${interaction.guildId}`);
            return;
        case "PUZZLE_NOT_FOUND":
            interactionReply(interaction, "Puzzle not found do try again!");
            return;
    }
}

export default { data, execute};