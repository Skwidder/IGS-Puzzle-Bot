import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, InteractionContextType } from "discord.js";
import { addPuzzle, advanceToNextPuzzle } from "../../ServerManager";
import { interactionReply } from "../../discordManager";
import type { IGSBot } from "../../IGSBot";
import { removePuzzleFromQueue, type PuzzleQueueItem } from "../../databaseManager";
import { Providers } from "../../providers/ProviderRegistry";


const data = new SlashCommandBuilder()
    .setName("puzzle")
    .setDescription("Puzzle queue control")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ModerateMembers)
    .setContexts(InteractionContextType.Guild)
    .addSubcommand(subcommand =>
        subcommand
            .setName('add')
            .setDescription('Add a puzzle to the queue')
            .addStringOption(option => 
                option
                    .setName('website')
                    .setDescription("The website that will be used")
                    .setRequired(true)
                    .setAutocomplete(true)
                ) 
            .addStringOption(option =>
                option
                    .setName('id')
                    .setRequired(true)
                    .setDescription("Puzzle ID to add from the website")
                // .setAutocomplete(true)
            )
            .addStringOption(option =>
                option
                    .setName('postion')
                    .setDescription('Where in the queue should it be added')
                    .addChoices(
                        {name: 'Next', value: 'next'},
                        {name: 'Last', value: 'last'},
                    )
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName("remove")
            .setDescription("Remove a puzzle from the queue")
            .addStringOption(option =>
                option
                    .setName("remove")
                    .setRequired(true)
                    .setDescription("Puzzle to remove")
                    .setAutocomplete(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('next')
            .setDescription('Move the server to next puzzle in the queue. This will remove the current puzzle')
    )
                

async function execute(interaction: ChatInputCommandInteraction){
    const client: IGSBot = interaction.client as IGSBot;
    if(!interaction.guildId) throw Error("Puzzle run not on server");

    switch(interaction.options.getSubcommand()){
        case "next":
            nextPuzzleHandle(interaction);
            break;
        case "remove":
            const toRemove = interaction.options.getString("remove");
            if(!toRemove) return interactionReply(interaction, "Input not valid");
            const [sourceStr, puzzleId] = toRemove.split('|');

            // Check if the string is a valid value of the Providers enum
            const source = Object.values(Providers).find(p => p === sourceStr);

            if(!source) return interactionReply(interaction,"Invalid Puzzle Source");

            const item: PuzzleQueueItem = {
                source: source,
                puzzleId: puzzleId
            }
            
            const removeResults = await removePuzzleFromQueue(client, interaction.guildId, item);
            if(!removeResults) interactionReply(interaction, "Remove fail, if issues presists make a bug report");
            interactionReply(interaction,`${sourceStr}: ${puzzleId} removed!`);
            break;
        case "add":
            const website = interaction.options.getString("website");
            const addSource = Object.values(Providers).find(p => p === website);
            if(!source) return interactionReply(interaction, "Website Invalid");
            const toAdd = interaction.options.getString("id");
            if(!website || !toAdd) return interactionReply(interaction, "Input not valid");

            const positionStr = interaction.options.getString('position');
            let position = -1
            if(positionStr === "next"){
                position = 1
            }

            const addResults = addPuzzle(client, interaction.guildId, source, toAdd, position);
            if(!addResults) interactionReply(interaction, "add fail, verify input");
            interactionReply(interaction, `${website}: ${toAdd} added!`);
            break;
        default:
            throw Error(`Puzzle subcommand not supported: ${interaction.options.getSubcommand()}`);
            break;
    }
}

async function nextPuzzleHandle(interaction: ChatInputCommandInteraction) {
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

export default { data, execute }