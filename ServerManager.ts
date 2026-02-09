import type { Channel, GuildBasedChannel, GuildChannelResolvable, Interaction, RepliableInteraction, Role, StageInstance } from "discord.js";
import { clearSchedule, getServer, movePuzzleQueue, resetPuzzle, setActivePuzzle, setSchedule, type ActivePuzzle, type CollectionSource, type PuzzleQueueItem } from "./databaseManager";
import { type ServerConfig, type UserDocument } from "./databaseManager";
import type { IGSBot } from "./IGSBot";
import type { PuzzleProvider } from "./providers/PuzzleProvider";
import * as schedule from "node-schedule";
import cronValidator  from 'cron-validator';
import { interactionReply } from "./discordManager";

//Discriminated Union
export type NextPuzzleResult = 
    | { success: true; message: string} 
    | { success: false; errorType:'EMPTY_QUEUE' | 'NO_COLLECTIONS' | 'DB_ERROR' | 'SERVER_NOT_FOUND' | 'PUZZLE_NOT_FOUND' | 'COLLECTION_NOT_FOUND'};


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
    
    if(!puzzles) return{success: false, errorType: "COLLECTION_NOT_FOUND"};
    
    const puzzleId = puzzles[Math.floor(Math.random() * puzzles.length)];
    const puzzle: ActivePuzzle | null = await provider.fetchPuzzle(puzzleId);

    if(!puzzle) return {success: false, errorType: 'PUZZLE_NOT_FOUND'};
    
    setActivePuzzle(client, guildId, puzzle);
    resetPuzzle(client, guildId);

    return {success: true, message: "No puzzles in queue; using random approved collection!"};
  }

  const nextPuzzle: PuzzleQueueItem | null = await movePuzzleQueue(client, guildId);
  if(!nextPuzzle) return {success: false, errorType: "DB_ERROR"}; //it must be a db error or a race condition

  const provider: PuzzleProvider = await client.providerRegistry.get(nextPuzzle.source);
  const puzzle: ActivePuzzle = await provider.fetchPuzzle(nextPuzzle.puzzleId);
  
  if(!puzzle) return {success: false, errorType: 'PUZZLE_NOT_FOUND'}

  setActivePuzzle(client,guildId, puzzle);
  resetPuzzle(client, guildId);

  return {success: true, message: "Server moved to next puzzle!"};
}


export async function scheduleAnnoucmnet(
  client: IGSBot, 
  serverId: string, 
  scheduleExpression: string, 
  channelId: string, 
  role?: string): 
  Promise<schedule.Job | "CRON_INVALID" | "NO_PERMISSIONS" | "INVALID_CHANNEL" | "INVALID_SERVER">{

  if (!cronValidator.isValidCron(scheduleExpression)) return "CRON_INVALID"; 

  const guild = await client.guilds.fetch(serverId);
  if (!guild) {
    console.log(`Not seeing ${serverId} Bot may have been kicked`);
    return "INVALID_SERVER"
  }

  const channel: GuildBasedChannel | null = await guild.channels.fetch(channelId);
  if ((!channel || !channel.isTextBased())  && channel?.isDMBased()) return "INVALID_CHANNEL";

  const me = guild.members.me;
  if (!me) return "NO_PERMISSIONS";

  const botPermissions = channel?.permissionsFor(me);

  if (botPermissions?.missing("SendMessages")) return "NO_PERMISSIONS";

  client.scheduledJobs[serverId] = await schedule.scheduleJob(scheduleExpression, async () => {
      try{
          await advanceToNextPuzzle(client,serverId);
      }catch(error){
          console.error(`Server: ${guild.name} has no queue or approved collections at scheduled time`);
          return;
      }

      annoucePuzzle(client,serverId,channel,role ?? undefined);
  });

  console.log(`Creating Schedule for ${guild.name} to Run at: ${scheduleExpression}`);
  return client.scheduledJobs[serverId];
}

export async function newSchedule(interaction: RepliableInteraction, scheduleExpression: string, channelId: string, role?: string){
  const client: IGSBot = interaction.client as IGSBot;
  const serverId: string | null = interaction.guildId;
  
  if(!serverId) throw Error("[New Schedule]: ServerId Not found from Interaction")

  //Remove old schedual to be safe
  //TODO: This might cause an issue where user gives up after failing then they dont have a schedule any more
  client.scheduledJobs?.serverId?.cancel();
  await clearSchedule(client, serverId);
  
  
  const results = await scheduleAnnoucmnet(client, serverId, scheduleExpression, channelId, role);

  switch (results){
    case "CRON_INVALID":
      interactionReply(interaction, "Cron Invalid");
      return;
    case "INVALID_CHANNEL":
      interactionReply(interaction, "Invalid channel");
      return;
    case "INVALID_SERVER":
      interactionReply(interaction,"Invalid Server, Please report on github")
      throw Error(`[New Schedule]: Invalid Server ${interaction.guildId}`);
    case "NO_PERMISSIONS":
      interactionReply(interaction,"Bot dose not have permission in that channel");
      return;
    default:
      interactionReply(interaction, "Success");
      break;
  }

  setSchedule(client, serverId, scheduleExpression, channelId, role);
}

export async function turnOffSchedule(interaction: RepliableInteraction){
  const client: IGSBot = interaction.client as IGSBot;
  const serverId: string | null = interaction.guildId;
  
  if(!serverId) throw Error("[New Schedule]: ServerId Not found from Interaction")

  client.scheduledJobs?.serverId?.cancel();
  await clearSchedule(client, serverId);

  interactionReply(interaction, 'Puzzle advancement scheduling has been turned off.');
}