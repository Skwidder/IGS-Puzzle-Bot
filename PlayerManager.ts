import { Message, type Interaction } from "discord.js"
import { getServer, getUser, removeLastMove, resetUserActiveServers, 
    resetUserMoves, setUserActiveServer, type ActivePuzzle, type ServerConfig, type UserDocument, type UserServerState } from "./databaseManager";
import type { IGSBot } from "./IGSBot";
import { GoBoardImageBuilder } from "./ImageBuilder";
import { Position } from "wgo";
import { standardNotationToSGF } from "./utils/utils";
import type { MoveResponse, PuzzleProvider } from "./providers/PuzzleProvider";
import { getSimulatedBoard } from "./Simulator";
import { sendPuzzleSelectorMenu, sendUserDM } from "./discordManager";


export async function userMessageHandle(message: Message){
    if(message.content[0] == '!'){

        const client: IGSBot = message.client as IGSBot;
        const player: UserDocument | null = await getUser(client, message.author.id);
        
        //Should be unlikily as /play should create the user but lets be safe
        if(!player){
            //TODO: Create Player?
            throw new Error("pelase implment");
        }

        const activeServer: UserServerState | null = player?.guilds?.filter(g => g.active === 1)[0] || null;
        const inProgressServers: UserServerState[] | null =  player?.guilds?.filter(g => g.in_progress === 1) || null; 

        if(!activeServer){
            if(inProgressServers.length == 0){
                sendUserDM(message.author, "You have no in-progress puzzles, please go on a server and do /play to add one");
                return;
            }else if(inProgressServers.length == 1){
                await setUserActiveServer(client,player.userId,inProgressServers[0].guildId);
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
        

        const puzzle: ActivePuzzle | undefined = await getUserActivePuzzle(client,player);
        
        if(!puzzle) throw Error("How do we have an active server but no active puzzle?");

        const puzzleProvider: PuzzleProvider = client.providerRegistry.get(puzzle.source);
        let newMoveSGF: string | undefined | null = undefined;
        let response: MoveResponse | undefined = undefined;


        //move
        if(message.content.toUpperCase() === "!RESET"){
            await resetUserMoves(client,message.author.id);
        }else if(message.content.toUpperCase() === "!UNDO"){
            const playerColor = puzzle.initialPlayer == "black" ? "B" : "W";
            const responseColor = puzzle.initialPlayer == "white" ? "B" : "W";

            //Check if last move in active moves is from the Response
            //If it is we need to remove 2 Moves
            if(activeServer.active_moves[-1].charAt(0) === responseColor){
                await removeLastMove(client, player.userId);
            }
            
            await removeLastMove(client, player.userId);
        }else{
            newMoveSGF = standardNotationToSGF(puzzle.initialPlayer, message.content.trim().slice(1,3), puzzle.size);
            if (!newMoveSGF) return; //TODO: Let user Know Invalid Move
            response = await puzzleProvider.getMoveResponse(puzzle, activeServer.active_moves, newMoveSGF);
        }

        
        //Then simulate and build the image
        const board: Position | false =
                await getSimulatedBoard(puzzle, activeServer.active_moves, newMoveSGF, response);

        if(!board) return; //TODO: Let user Know Invalid Move

        const builder = new GoBoardImageBuilder(board.size);
        builder.addWgoGridStones(board.grid);
        if(response?.marks){
            //Add circle on response move
            if(response.responseMove){
                response.marks.push(`CR[${response.responseMove.substring(2,4)}]`);
            }
            builder.addSGFMarks(response.marks);
        } else {
            const marks = await puzzleProvider.getMarks(puzzle,activeServer.active_moves);
            if(marks){
                if(activeServer.active_moves[-1]){
                    marks.push(`CR[${activeServer.active_moves[-1].substring(2,4)}]`);
                }
                builder.addSGFMarks(marks);
            }
        }

        const pngPath = `${player.userId}.png`
        builder.saveAsPNG(pngPath);
        
        //TODO: send to user
    }
}

async function getUserActivePuzzle(client:IGSBot, user: UserDocument): Promise<ActivePuzzle | undefined> {

    const activeServer: UserServerState | null = user?.guilds?.filter(g => g.active === 1)[0] || null;
    const server = await getServer(client, activeServer.guildId);
    
    return server?.active_puzzle;
}