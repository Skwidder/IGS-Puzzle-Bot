import { Client } from 'discord.js';
import { IGSBot } from './IGSBot';
import { Providers } from './providers/ProviderRegistry';
import type { InsertOneResult } from 'mongodb';

export interface UserServerState {
  guildId: string;
  score: number;
  active_moves: string[];
  tries: number;
  active: number;
  in_progress: number;
  solved: boolean;
  all_time_score: number;
}
export interface UserDocument {
  _id?: any;
  userId: string;
  guilds: UserServerState[];
}

export interface ServerConfig {
  _id?: any;
  serverId: string;
  name: string;
  puzzle_queue: PuzzleQueueItem[];
  collection_sources: CollectionSource[];
  active_puzzle?: ActivePuzzle;
  announcementChannel?: string;
  announcementRole?: string;
  scheduleExpression?: string;
}

export interface PuzzleQueueItem {
  source: Providers;
  puzzleId: string | number;
}

export interface ActivePuzzle {
  source: Providers;
  puzzleId: string | number;
  tree: any;
  size: number;
  initialPlayer: "white" | "black";
  whiteStonesInitial: string[]; 
  blackStonesInitial: string[];
  author: string;
  description?: string;
  collectionName?: string;
}

export interface CollectionSource {
  source: Providers;
  name: string;
  type: 'COLLECTION' | 'SEARCH';
  payload: string | number;
}

export async function ensureAllServersExist(client: IGSBot) {
  const serversCollection = client.serverCol;

  // Get the list of guilds and loop through each checking if they exist
  const guilds = client.guilds.cache//.each((guild) => {

  for (const [, guild] of guilds) {
    const existingServer = await serversCollection.findOne({ serverId: guild.id });

    if (!existingServer) {
      console.log(`Server ${guild.id} does not exist. Creating...`);

      await serversCollection.insertOne({
        'serverId': guild.id,
        'name': guild.name,
        'puzzle_queue': [],
        'collection_sources': [],
      });
    }
  }
}

export async function getServer(client: IGSBot, guildId: string): Promise<ServerConfig | null> {
  const activePuzzleServer = await client.serverCol.findOne({
    "serverId": guildId
  })

  return activePuzzleServer;
}

export async function getUser(client: IGSBot, userId: string): Promise<UserDocument | null> {
  const user: UserDocument | null = await client.usersCol.findOne({
    "userId": userId
  });

  return user ?? null;
}

export async function getUserActiveServerState(client: IGSBot, userId: string): Promise<UserServerState | null>{
  const user = await getUser(client, userId);
  if(!user) return null;

  const activeServer: UserServerState[] = user?.guilds?.filter(g => g.active === 1) || [];
  if(activeServer.length !== 1) return null;

  return activeServer[0];
}

export async function addUserMove(client: IGSBot, userId: string, stoneToAdd: string) {
  await client.usersCol.updateOne({
    "userId": userId,
    "guilds.active": 1
  }, {
    $push: {
      "guilds.$.active_moves": stoneToAdd
    }
  });
}

export async function removeLastMove(client: IGSBot, userId: string): Promise<UserServerState | null> {
  client.usersCol.updateOne({
    "userId": userId,
    "guilds.active": 1
  }, {
    $pop: {
      "guilds.$.active_moves": 1
    }
  });
  
  return await getUserActiveServerState(client, userId);
}

export async function resetUserMoves(client: IGSBot, userId: string): Promise<UserServerState | null> {
  await client.usersCol.updateOne(
    {
      "userId": userId,
      "guilds.active": 1
    },
    {
      $set: {
        "guilds.$.active_moves": []
      }
    }
  );

  return await getUserActiveServerState(client, userId);
}

//sets active moves to [], tires to 0 and in progress to 0, and active to 0
export async function resetPuzzle(client: IGSBot, guildId: string) {
  await client.usersCol.updateMany(
    { "guilds.guildId": guildId },
    {
      $set: {
        "guilds.$.active_moves": [],
        "guilds.$.tries": 0,
        "guilds.$.active": 0,
        "guilds.$.in_progress": 0,
        "guilds.$.solved": false,
      }
    });
}

/**
 * 
 * @param client IGSBot
 * @param guildId id of the server to move the queue
 * @returns PuzzleQueueItem The first element in the queue before the move,
 * aka the one that got removed or null if the server dose not exist or no item was removed
 */
export async function movePuzzleQueue(client: IGSBot, guildId: string): Promise<PuzzleQueueItem | null> {
  const server = await getServer(client,guildId);
  if(!server) return null;


  const response = await client.serverCol.updateOne(
    { serverId: guildId },
    { $pop: { puzzle_queue: -1 } });  // -1 removes first element

  if(response.modifiedCount = 0) return null; 

  return server.puzzle_queue[0]; //return old first item
}

export async function incrementTries(client: IGSBot, userId: string) {
  await client.usersCol.updateOne(
    {
      "userId": userId,
      "guilds.active": 1
    },
    {
      $inc: {
        "guilds.$.tries": 1
      }
    })
}

export async function incrementScore(client: IGSBot, userId: string) {
  await client.usersCol.updateOne(
    {
      "userId": userId,
      "guilds.active": 1
    },
    {
      $inc: {
        "guilds.$.score": 1,
        "guilds.$.all_time_score": 1
      }
    }
  );
}

export async function setSolved(client: IGSBot, userId: string, solved: boolean = false) {
  await client.usersCol.updateOne(
    {
      "userId": userId,
      "guilds.active": 1
    },
    {
      $set: {
        "guilds.$.solved": solved
      }
    }
  );
}

export async function setUserActiveServer(client: IGSBot, userId: string, activeServerId: string){
  const response = await client.usersCol.updateOne(
    {
      "userId": userId,
      "guilds.guildId": activeServerId
    },
    {
      $set: {
        "guilds.$.in_progress": 1,
        "guilds.$.active": 1
      }
    }
  );

  if(response.matchedCount === 0){
    //Add server to the user
    await client.usersCol.updateOne(
      { 
          userId: userId,
      },
      {
          $push : {
              guilds: {
                  guildId: activeServerId,
                  score : 0,
                  active_moves: [],
                  tries: 0,
                  active: 0,
                  in_progress: 1,
                  solved: false,
                  all_time_score: 0
              }
          }
      },
      { upsert: true }
    );
  }
}

export async function resetUserActiveServers(client: IGSBot, userId: string){
  //could get away with update one but lets just be safe
  await client.usersCol.updateMany(
    {
      "userId": userId,
      "guilds.active": 1
    },
    {
      $set: {
        "guilds.$.active": 0
      }
    }
  );
}

export type InProgressPuzzleEntry = UserServerState & {
  serverName: string;
};

//TODO: I really dont like this function the way it is
export async function getInProgessPuzzles(client: IGSBot, userId: string): Promise<InProgressPuzzleEntry[]> {
  const user = await getUser(client, userId);
  // Then count inprogress puzzles using chained operations:
  const inProgressPuzzles = user?.guilds?.filter(g => g.in_progress === 1) || [];

  const results: InProgressPuzzleEntry[] = await Promise.all(
    inProgressPuzzles.map(async (item) => {
      const serverConfig = await client.serverCol.findOne({
        serverId: item.guildId
      });

      return {
        ...item,
        serverName: serverConfig?.name ?? "Unknown Server",
      };
    }
    ));

  return results;
}

export async function getScores(client: IGSBot, guildId: string) {
  const userArray = await client.usersCol.aggregate([
    // Unwind the guilds array to work with individual guild documents
    { $unwind: "$guilds" },

    // Match only the specific guild we want
    { $match: { "guilds.guildId": guildId } },

    // Project only the fields we need
    {
      $project: {
        userId: 1,
        score: "$guilds.score"
      }
    }
  ]).toArray();

  return userArray;
}

export async function resetLeaderboard(client: IGSBot, guildId: string) {
  await client.usersCol.updateMany({
    "guilds.guildId": guildId
  },
    { $set: { "guilds.$.score": 0 } }
  );

  await client.usersCol.updateMany({
    "guilds": { $elemMatch: { "guildId": guildId, "solved": true } }
  },
    { $set: { "guilds.$.score": 1 } }
  );
}

export async function setActivePuzzle(client: IGSBot, guildId: string, puzzle: ActivePuzzle) {
  await client.serverCol.updateOne({
    "serverId": guildId
  },
    { $set: { "active_puzzle": puzzle } }
  );
}

export async function addPuzzleToQueue(client: IGSBot, guildId: string, puzzle: PuzzleQueueItem, postion?: number){
  const results = await client.serverCol.updateOne({
    "serverId": guildId,
  },{
    $push: {
      puzzle_queue: {
        $each: [{
          "source": puzzle.source,
          "puzzleId": puzzle.puzzleId
        }],
        $position: postion ?? undefined
      }
    }
  });
  return results.modifiedCount > 0;
}

export async function removePuzzleFromQueue(client: IGSBot, guildId: string, puzzle: PuzzleQueueItem): Promise<boolean>{
  const results = await client.serverCol.updateOne({
    "serverId": guildId,
  },{
    $pull : {
      puzzle_queue: {
        "source": puzzle.source,
        "puzzleId": puzzle.puzzleId
      }
    }
  });
  return results.modifiedCount > 0;
}

export async function addCollection(client: IGSBot, guildId: string, collection: CollectionSource) {
  const results = await client.serverCol.updateOne({
    "serverId": guildId,
  },{
    $push: {
      collection_sources: {
        "name": collection.name,
        "payload": collection.payload,
        "source": collection.source,
        "type": collection.type
      }
    }
  });
  return results.modifiedCount > 0;
}

export async function removeCollection(client: IGSBot, guildId: string, provider: Providers, name: string){
  const results = await client.serverCol.updateOne({
    "serverId": guildId,
  },{
    $pull : {
      collection_sources: {
        "source": provider,
        "name": name
      }
    }
  });
  return results.modifiedCount > 0;
}

export async function setSchedule(client: IGSBot, guildId: string, scheduleExpression: string, channelId: string, role?: string) {
  await client.serverCol.updateOne({
    "serverId": guildId
  },
  { $set: { 
    "announcementChannel": channelId,
    "announcementRole": role, 
    "scheduleExpression": scheduleExpression }} 
  );
}

export async function clearSchedule(client: IGSBot, guildId: string) {
  await client.serverCol.updateOne({
    "serverId": guildId
  },
  { $unset: { 
    "announcementChannel": 1,
    "announcementRole": 1,
    "scheduleExpression": 1 }} 
  );
}
  
export async function createDBUser(client: IGSBot, userId: string): Promise<InsertOneResult<UserDocument>>{
  return await client.usersCol.insertOne({
    "userId": userId,
    "guilds": [],
  });
}

export async function createDBServer(client: IGSBot, guildId: string, guildName: string){
  await client.serverCol.insertOne({
    'serverId' : guildId,
    'name' : guildName,  
    'puzzle_queue' : [],
    'collection_sources': [],
  });
}