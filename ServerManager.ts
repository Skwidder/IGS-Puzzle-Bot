import { getServer, resetPuzzle } from "./database";
import { type ServerConfig, type UserDocument } from "./database";
import type { IGSBot } from "./IGSBot";

//Discriminated Union
export type NextPuzzleResult = 
    | { success: true; message: string} 
    | { success: false; errorType:'EMPTY_QUEUE' | 'NO_COLLECTIONS' | 'DB_ERROR' | 'SERVER_NOT_FOUND'};


export async function advanceToNextPuzzle(client: IGSBot, guildId: string): Promise<NextPuzzleResult> {
  const server: ServerConfig | null = await getServer(client, guildId);
  if(!server) return { success: false, errorType: 'SERVER_NOT_FOUND'}

  if (server.puzzle_queue.length < 1) {
    if (!server.collection_sources) {
        return { success: false, errorType: 'NO_COLLECTIONS'}
    }

    const collectionId = server.collection_sources[Math.floor(Math.random() * server.collection_sources.length)];
    const puzzles = await getAllPuzzlesInCollection(collectionId);
    const puzzle = puzzles[Math.floor(Math.random() * puzzles.length)];

    await client.serverCol.updateOne(
      { serverId: guildId },
      {
        $push: {
          puzzle_queue: puzzle.id
        }
      }
    );

    resetPuzzle(client, guildId);

    //edge case
    if (queue.length >= 1) {
      await moveQueue(client, guildId);
    }

    return {success: true, message: "No puzzles in queue; using random approved collection!"};
  }

  resetPuzzle(client, guildId);
  await moveQueue(client, guildId);

  return {success: true, message: "Server moved to next puzzle!"};
}