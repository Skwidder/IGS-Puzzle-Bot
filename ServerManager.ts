import { getServer, movePuzzleQueue, pushActivePuzzle, resetPuzzle, setActivePuzzle, type ActivePuzzle, type CollectionSource, type PuzzleQueueItem } from "./database";
import { type ServerConfig, type UserDocument } from "./database";
import type { IGSBot } from "./IGSBot";
import type { PuzzleProvider } from "./providers/PuzzleProvider";

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

    const collectionSource: CollectionSource = server.collection_sources[
      Math.floor(Math.random() * server.collection_sources.length)];
    
    const provider: PuzzleProvider = await client.providerRegistry.get(collectionSource.source);

    const puzzles = await provider.discoverPuzzles(collectionSource);
    const puzzleId = puzzles[Math.floor(Math.random() * puzzles.length)];
    const puzzle: ActivePuzzle = await provider.fetchPuzzle(puzzleId);
    
    setActivePuzzle(client, guildId, puzzle);
    resetPuzzle(client, guildId);

    return {success: true, message: "No puzzles in queue; using random approved collection!"};
  }

  const nextPuzzle: PuzzleQueueItem | null = await movePuzzleQueue(client, guildId);
  if(!nextPuzzle) return {success: false, errorType: "DB_ERROR"}; //it must be a db error or a race condition

  const provider: PuzzleProvider = await client.providerRegistry.get(nextPuzzle.source);
  const puzzle: ActivePuzzle = await provider.fetchPuzzle(nextPuzzle.puzzleId);

  setActivePuzzle(client,guildId, puzzle);
  resetPuzzle(client, guildId);

  return {success: true, message: "Server moved to next puzzle!"};
}