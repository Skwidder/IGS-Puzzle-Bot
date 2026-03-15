import { ChatInputCommandInteraction, Client, Message, User, type AnySelectMenuInteraction, type APIEmbedField, type Interaction, type RepliableInteraction } from "discord.js"
import { addUserMove, createDBUser, getServer, getUser, getUserActiveServerState, removeLastMove, resetUserActiveServers, 
    resetUserMoves, setActivePuzzle, setUserActiveServer, type ActivePuzzle, type ServerConfig, type UserDocument, type UserServerState } from "./databaseManager";
import type { IGSBot } from "./IGSBot";
import { GoBoardImageBuilder } from "./ImageBuilder";
import { Position } from "wgo";
import { standardNotationToSGF } from "./utils/utils";
import type { MoveResponse, PuzzleProvider } from "./providers/PuzzleProvider";
import { getSimulatedBoard } from "./Simulator";
import { sendPuzzleSelectorMenu, sendUserDM } from "./discordManager";
import { embedMaker, embedPackager, infoToEmbedFields, type EmbedPackage } from "./MessageBuilder";



export async function userMessageHandle(message: Message){
    if(message.content[0] == '!'){

        const client: IGSBot = message.client as IGSBot;
        let player: UserDocument | null = await getUser(client, message.author.id);
        
        //Should be unlikily as /play should create the user but lets be safe
        if(!player){
            player = await createUser(client, message.author.id);
            if(!player) {
                throw Error("Player dose not exist and could not be created");
                return;
            }
        }


        let activeServer = await getUserActiveServerState(client, message.author.id);
        const inProgressServers: UserServerState[] | null =  player?.guilds?.filter(g => g.in_progress === 1) || null; 

        if(!activeServer){
            if(!inProgressServers || inProgressServers.length == 0){
                sendUserDM(message.author, "You have no in-progress puzzles, please go on a server and do /play to add one");
                return;
            }else if(inProgressServers.length == 1){
                await setUserActiveServer(client,player.userId,inProgressServers[0].guildId);
                activeServer = await getUserActiveServerState(client, message.author.id);
            }
        }

        if(inProgressServers?.length > 1){
            //set all puzzles to inactive so they can select with the puzzle selector menu
            resetUserActiveServers(client,player.userId);
            let inProgressGuilds: ServerConfig[] = [];

            for (const server of inProgressServers) {
                const guild = await getServer(client, server.guildId);
                if(!guild) continue;
                inProgressGuilds.push(guild);
            }

            sendPuzzleSelectorMenu(message.author, inProgressGuilds);
            return;
        }

        if(!activeServer) throw Error("Active server should be set by now");
        const puzzle: ActivePuzzle | undefined = await getUserActivePuzzle(client,player);
        
        if(!puzzle) throw Error("How do we have an active server but no active puzzle?");

        const puzzleProvider: PuzzleProvider = client.providerRegistry.get(puzzle.source);
        let newMoveSGF: string | undefined | null = undefined;
        let response: MoveResponse | undefined = undefined;


        //move
        if(message.content.toUpperCase() === "!RESET"){
            activeServer = await resetUserMoves(client,message.author.id);
        }else if(message.content.toUpperCase() === "!UNDO"){
            const playerColor = puzzle.initialPlayer == "black" ? "B" : "W";
            const responseColor = puzzle.initialPlayer == "white" ? "B" : "W";

            //Check if last move in active moves is from the Response
            //If it is we need to remove 2 Moves
            if(activeServer.active_moves.length > 1){
                if(activeServer.active_moves[(activeServer.active_moves.length - 1)].charAt(0) === responseColor){
                    await removeLastMove(client, player.userId);
                }
            }
            
            activeServer = await removeLastMove(client, player.userId);
        }else{
            newMoveSGF = standardNotationToSGF(puzzle.initialPlayer, message.content.trim().substring(1), puzzle.size);
            if (!newMoveSGF){
                sendUserDM(message.author, "Invalid Move, please provide a valid move");
                return;
            } 
            response = await puzzleProvider.getMoveResponse(puzzle, activeServer.active_moves, newMoveSGF);
        }

        if(!activeServer) throw Error("Active server should be set by now");

        const renderOptions: RenderBoardOptions = {
            newMoveSGF: newMoveSGF,
            response: response,
        }
        renderAndSendBoard(client, message.author, puzzle, activeServer.active_moves, renderOptions);
        return;
    }
    sendUserDM(message.author,"Invalid Command!");
}


export async function interactionHandle(interaction: AnySelectMenuInteraction){
    await interaction.update({ content: 'Puzzle Selected!', components: [] });

    const client: IGSBot = interaction.client as IGSBot;
    await setUserActiveServer(client, interaction.user.id, interaction.values[0]);

    const user = await getUser(client,interaction.user.id);
    if(!user) throw Error("[Player Manager] User responded to select string but is not a user?");
    const puzzle = await getUserActivePuzzle(client, user);
    if(!puzzle) throw Error("[Player Manager] Race Condition");    
    
    const activeServer: UserServerState | null = user?.guilds?.filter(g => g.active === 1)[0] || null;
    if(!activeServer) throw Error("[Player Manager] Race Condition");

    const renderOptions: RenderBoardOptions = {
        showHelp: true
    }

    renderAndSendBoard(client, interaction.user, puzzle, activeServer.active_moves, renderOptions);
}

export async function playerPlay(interaction: ChatInputCommandInteraction){
    const client: IGSBot = interaction.client as IGSBot;

    let player: UserDocument | null = await getUser(client, interaction.user.id);
    if(!player){
        player = await createUser(client, interaction.user.id);
        if(!player) {
            throw Error("Player dose not exist and could not be created");
            return;
        }
    }

    if(!interaction.guild) throw Error("/play not on a server?");
    
    let activeServer: UserServerState | null = player?.guilds?.filter(g => g.active === 1)[0] || null;
    const inProgressServers: UserServerState[] | null =  player?.guilds?.filter(g => g.in_progress === 1) || null; 

    if(!activeServer){
        if(!inProgressServers || inProgressServers.length == 0){
            await setUserActiveServer(client, interaction.user.id, interaction.guild.id);
            playerPlay(interaction);
            return;
        }else if(inProgressServers.length == 1){
            await setUserActiveServer(client,player.userId,inProgressServers[0].guildId);
            playerPlay(interaction);
            return;
        }
    }

    if(inProgressServers?.length > 1){
        //set all puzzles to inactive so they can select with the puzzle selector menu
        resetUserActiveServers(client,player.userId);
        let inProgressGuilds: ServerConfig[] = [];

        for (const server of inProgressServers) {
            const guild = await getServer(client, server.guildId);
            if(!guild) continue;
            inProgressGuilds.push(guild);
        }

        sendPuzzleSelectorMenu(interaction.user, inProgressGuilds);
        return;
    }

    const puzzle: ActivePuzzle | undefined = await getUserActivePuzzle(client,player);
    
    if(!puzzle) throw Error("How do we have an active server but no active puzzle?");

    const puzzleProvider: PuzzleProvider = client.providerRegistry.get(puzzle.source);
    
    const renderOptions: RenderBoardOptions = {
        showHelp: true,
    }

    renderAndSendBoard(client, interaction.user, puzzle, activeServer.active_moves ?? [], renderOptions);
}

interface RenderBoardOptions {
    newMoveSGF?: string | null;
    response?: MoveResponse;
    showHelp?: boolean; // Maps to the 4th argument in infoToEmbedFields
}

async function renderAndSendBoard(
    client: IGSBot,
    user: User,
    puzzle: ActivePuzzle,
    activeMoves: string[],
    options: RenderBoardOptions = {}
) {
    let { newMoveSGF, response, showHelp = false } = options;

    // take care of null newMoveSGF
    if(!newMoveSGF){
        newMoveSGF = undefined;
    }

    // Simulate the board
    const board: Position | false = await getSimulatedBoard(puzzle, activeMoves, newMoveSGF, response);

    if (!board) {
        await sendUserDM(user, "Invalid Move, please provide a valid move");
        return;
    }

    //We now know its a okay move
    //TODO: find a way to move this
    if(newMoveSGF) await addUserMove(client, user.id, newMoveSGF);
    if(response?.responseMove) addUserMove(client, user.id, response.responseMove);

    // Build Image and Grid
    const builder = new GoBoardImageBuilder(board.size);
    builder.addWgoGridStones(board.grid);

    //Process Marks
    const puzzleProvider: PuzzleProvider = client.providerRegistry.get(puzzle.source);
    
    if (response?.marks) {
        if (response.responseMove) {
            response.marks.push(`CR[${response.responseMove.substring(2, 4)}]`);
        }
        builder.addSGFMarks(response.marks);
    } else {
        const marks = await puzzleProvider.getMarks(puzzle, activeMoves);
        if (marks) {
            const lastMove = activeMoves.at(-1); 
            if (lastMove) {
                marks.push(`CR[${lastMove.substring(2, 4)}]`);
            }
            builder.addSGFMarks(marks);
        }
    }

    // Save Image
    const pngPath = `${user.id}.png`;
    await builder.saveAsPNG(pngPath);

    // Build and send the embed message
    const fields: APIEmbedField[] = infoToEmbedFields(client, puzzle, response, false, showHelp);
    const embed = embedMaker(fields);
    const messagePackage: EmbedPackage = embedPackager(embed, pngPath);
    
    await sendUserDM(user, "", messagePackage);

    // Cleanup
    builder.deletePNG();
}

async function getUserActivePuzzle(client:IGSBot, user: UserDocument): Promise<ActivePuzzle | undefined> {

    const activeServer: UserServerState | null = user?.guilds?.filter(g => g.active === 1)[0] || null;
    const server = await getServer(client, activeServer.guildId);
    
    return server?.active_puzzle;
}

async function createUser(client: IGSBot, userId: string): Promise<UserDocument | null> {
    const result = await createDBUser(client, userId);
    if(!result.acknowledged) throw Error(`[Player Manager]: User creation failed id ${userId}`);

    return await getUser(client, userId);
}