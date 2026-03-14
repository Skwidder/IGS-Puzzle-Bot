import { MongoClient, ObjectId } from 'mongodb';
import { OGSProvider } from '../providers/OGSProvider';

// Constants for your migration
const DRY_RUN = false; 

async function migrateServer() {
  const client = new MongoClient(Bun.env.DBCONNSTRING || "");
  try {
    await client.connect();
    const db = client.db('Puzzle_Bot');
    const collection = db.collection('servers');

    // Find documents that still have the old 'approved_collections' field
    // or where 'puzzle_queue' contains numbers instead of objects.
    const cursor = collection.find({
      $or: [
        { "approved_collections": { $exists: true } },
        { "puzzle_queue.0": { $type: "number" } }
      ]
    });

    const docs = await cursor.toArray();

    let provider = new OGSProvider();

    for (const doc of docs) {
        const updates: any = {};
        const unsets: any = {};

        // 1. Migrate puzzle_queue (number[] -> PuzzleQueueItem[])
        console.log(`Array test: ${Array.isArray(doc.puzzle_queue)}`)
        if (Array.isArray(doc.puzzle_queue) && typeof doc.puzzle_queue[0] === 'number') {
            updates.puzzle_queue = doc.puzzle_queue.map((id: number) => ({
            source: 'ogs', // Defaulting to your current provider
            puzzleId: id
            }));

             // 2. Pop off puzzle_queue[0] into active_puzzle
             // need to get the details from OGS
            const firstItem = updates.puzzle_queue.shift(); // Remove from queue
            const activePuzzle = await provider.fetchPuzzle(firstItem.puzzleId);
            if(activePuzzle){
                updates.active_puzzle = activePuzzle;
            }
        }

        // 3. Migrate approved_collections -> collection_sources
        if (doc.approved_collections) {
            updates.collection_sources = doc.approved_collections.map((id: number | string) => ({
            source: 'ogs',
            type: 'COLLECTION',
            payload: id
            }));
            unsets.approved_collections = ""; // Remove old field
        }

        if (Object.keys(updates).length > 0) {
            if (DRY_RUN) {
            console.log(`[DRY RUN] Would update Server ${doc.name || doc._id}:`, updates);
            } else {
            await collection.updateOne(
                { _id: doc._id },
                { 
                $set: updates,
                $unset: unsets 
                }
            );
            console.log(`Successfully migrated Server: ${doc.name || doc.serverId}`);
        }
      }
    }
  } finally {
    await client.close();
  }
}


async function migratePlayer(){
    if(DRY_RUN) return;
    const client = new MongoClient(Bun.env.DBCONNSTRING || "");
    try {
        await client.connect();
        const db = client.db('Puzzle_Bot');
        const collection = db.collection('users');

        console.log("Starting player migration: Nuking active_moves and initializing new fields...");

        // This updates EVERY guild object inside the 'guilds' array for EVERY user
        const result = await collection.updateMany(
        {}, 
        {
            $unset: { "guilds.$[].active_moves": [] },
        }
        );

        console.log(`Migration complete. Matched ${result.matchedCount} users and updated ${result.modifiedCount} documents.`);

    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await client.close();
    }
}


migrateServer().catch(console.error);
migratePlayer().catch(console.error);