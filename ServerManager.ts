import {
  EmbedBuilder,
  Message,
  type Channel,
  type ChatInputCommandInteraction,
  type GuildBasedChannel,
  type GuildChannelResolvable,
  type Interaction,
  type RepliableInteraction,
  type Role,
  type StageInstance,
} from "discord.js";
import {
  addPuzzleToQueue,
  clearSchedule,
  getScores,
  getServer,
  movePuzzleQueue,
  resetPuzzle,
  setActivePuzzle,
  setSchedule,
  type ActivePuzzle,
  type CollectionSource,
  type PuzzleQueueItem,
} from "./databaseManager";
import { type ServerConfig, type UserDocument } from "./databaseManager";
import type { IGSBot } from "./IGSBot";
import { PuzzleProvider } from "./providers/PuzzleProvider";
import * as schedule from "node-schedule";
import cronValidator from "cron-validator";
import { interactionReply, sendAnnounceChannelMessage } from "./discordManager";
import { embedMaker, embedPackager, infoToEmbedFields } from "./MessageBuilder";
import { getSimulatedBoard } from "./Simulator";
import type { Position } from "wgo";
import { GoBoardImageBuilder } from "./ImageBuilder";
import type { Providers } from "./providers/ProviderRegistry";

//Discriminated Union
export type NextPuzzleResult =
  | { success: true; message: string }
  | {
      success: false;
      errorType:
        | "EMPTY_QUEUE"
        | "NO_COLLECTIONS"
        | "DB_ERROR"
        | "SERVER_NOT_FOUND"
        | "PUZZLE_NOT_FOUND"
        | "COLLECTION_NOT_FOUND";
    };

export async function advanceToNextPuzzle(
  client: IGSBot,
  guildId: string,
): Promise<NextPuzzleResult> {
  const server: ServerConfig | null = await getServer(client, guildId);
  if (!server) return { success: false, errorType: "SERVER_NOT_FOUND" };

  if (server.puzzle_queue.length < 1) {
    if (!server.collection_sources) {
      return { success: false, errorType: "NO_COLLECTIONS" };
    }

    const collectionSource: CollectionSource =
      server.collection_sources[
        Math.floor(Math.random() * server.collection_sources.length)
      ];

    const provider: PuzzleProvider = await client.providerRegistry.get(
      collectionSource.source,
    );
    const puzzles = await provider.discoverPuzzles(collectionSource);

    if (!puzzles) return { success: false, errorType: "COLLECTION_NOT_FOUND" };

    const puzzlePick = puzzles[Math.floor(Math.random() * puzzles.length)];
    const puzzle: ActivePuzzle | null = await provider.fetchPuzzle(puzzlePick);

    if (!puzzle) return { success: false, errorType: "PUZZLE_NOT_FOUND" };

    await setActivePuzzle(client, guildId, puzzle);
    resetPuzzle(client, guildId);

    return {
      success: true,
      message: "No puzzles in queue; using random approved collection!",
    };
  }

  const nextPuzzle: PuzzleQueueItem | null = await movePuzzleQueue(
    client,
    guildId,
  );
  if (!nextPuzzle) return { success: false, errorType: "DB_ERROR" }; //it must be a db error or a race condition

  const provider: PuzzleProvider = await client.providerRegistry.get(
    nextPuzzle.source,
  );
  const puzzle: ActivePuzzle | null = await provider.fetchPuzzle(
    nextPuzzle.puzzleId,
  );

  if (!puzzle) return { success: false, errorType: "PUZZLE_NOT_FOUND" };

  await setActivePuzzle(client, guildId, puzzle);
  resetPuzzle(client, guildId);

  return { success: true, message: "Server moved to next puzzle!" };
}

export async function scheduleAnnoucmnet(
  client: IGSBot,
  serverId: string,
  scheduleExpression: string,
  channelId: string,
  role?: string,
): Promise<
  | schedule.Job
  | "CRON_INVALID"
  | "NO_PERMISSIONS"
  | "INVALID_CHANNEL"
  | "INVALID_SERVER"
> {
  if (!cronValidator.isValidCron(scheduleExpression)) return "CRON_INVALID";

  const guild = await client.guilds.fetch(serverId);
  if (!guild) {
    console.log(`Not seeing ${serverId} Bot may have been kicked`);
    return "INVALID_SERVER";
  }

  const channel: GuildBasedChannel | null =
    await guild.channels.fetch(channelId);
  if ((!channel || !channel.isTextBased()) && channel?.isDMBased())
    return "INVALID_CHANNEL";

  const me = guild.members.me;
  if (!me) return "NO_PERMISSIONS";

  const botPermissions = channel?.permissionsFor(me);

  if (!botPermissions?.has(["SendMessages", "ViewChannel"]))
    return "NO_PERMISSIONS";

  client.scheduledJobs[serverId] = await schedule.scheduleJob(
    scheduleExpression,
    async () => {
      let response = {};
      try {
        response = await advanceToNextPuzzle(client, serverId);
      } catch (error) {
        sendAnnounceChannelMessage(
          client,
          guild.id,
          "No Approved collections or puzzles at announcement time. Please use /collection add or /puzzle add to add them, Or turn off" +
            "puzzle annoucnments with /schedule_puzzle off",
        );
        console.error(
          `Server: ${guild.name} has no queue or approved collections at scheduled time: ${error}`,
        );
        return;
      }

      const result = await annoucePuzzle(client, serverId);
      if (result == "NO_PERMISSIONS") {
        console.log(
          `Guild: ${guild.id} used to have channel access but no more`,
        );
      }
    },
  );

  console.log(
    `Creating Schedule for ${guild.name} to Run at: ${scheduleExpression}`,
  );
  return client.scheduledJobs[serverId];
}

export async function newSchedule(
  interaction: RepliableInteraction,
  scheduleExpression: string,
  channelId: string,
  role?: string,
): Promise<
  | schedule.Job
  | "CRON_INVALID"
  | "NO_PERMISSIONS"
  | "INVALID_CHANNEL"
  | "INVALID_SERVER"
> {
  const client: IGSBot = interaction.client as IGSBot;
  const serverId: string | null = interaction.guildId;

  if (!serverId)
    throw Error("[New Schedule]: ServerId Not found from Interaction");

  //Remove old schedual to be safe
  //TODO: This might cause an issue where user gives up after failing then they dont have a schedule any more
  client.scheduledJobs?.[serverId]?.cancel();
  delete client.scheduledJobs[serverId];

  await clearSchedule(client, serverId);

  const results = await scheduleAnnoucmnet(
    client,
    serverId,
    scheduleExpression,
    channelId,
    role,
  );
  setSchedule(client, serverId, scheduleExpression, channelId, role);

  return results;
}

export async function turnOffSchedule(interaction: RepliableInteraction) {
  const client: IGSBot = interaction.client as IGSBot;
  const serverId: string | null = interaction.guildId;

  if (!serverId)
    throw Error("[New Schedule]: ServerId Not found from Interaction");

  client.scheduledJobs?.[serverId]?.cancel();
  delete client.scheduledJobs[serverId];
  await clearSchedule(client, serverId);

  interactionReply(
    interaction,
    "Puzzle advancement scheduling has been turned off.",
  );
}

export async function annoucePuzzle(
  client: IGSBot,
  guildId: string,
  channelId?: string,
  roleId?: string,
): Promise<Message | null | "NO_PERMISSIONS" | "NO_PUZZLE"> {
  const server: ServerConfig | null = await getServer(client, guildId);
  if (!server) {
    console.log(`[Announce Puzzle] Server: ${guildId} apprears to be missing`);
    return null;
  }

  if (!server.active_puzzle) {
    return "NO_PUZZLE";
  }

  const board: Position | false = await getSimulatedBoard(
    server.active_puzzle,
    [],
  );
  if (!board) return null; //how has this happend

  const targetRole = roleId || server?.announcementRole;

  const builder = new GoBoardImageBuilder(board.size);
  builder.addWgoGridStones(board.grid);

  const puzzleProvider: PuzzleProvider = client.providerRegistry.get(
    server.active_puzzle.source,
  );
  const marks = await puzzleProvider.getMarks(server.active_puzzle, []);
  if (marks) {
    builder.addSGFMarks(marks);
  }

  await builder.saveAsPNG(`${guildId}.png`);

  const fields = infoToEmbedFields(
    client,
    server.active_puzzle,
    undefined,
    true,
  );
  const embed = embedMaker(fields);
  const messagePackage = embedPackager(embed, `${guildId}.png`);
  const response = await sendAnnounceChannelMessage(
    client,
    guildId,
    targetRole ? `<@&${targetRole}>` : undefined,
    messagePackage,
    channelId,
  );

  builder.deletePNG();
  if (!response) return "NO_PERMISSIONS";
  return response;
}

export async function showLeaderBoard(
  interaction: ChatInputCommandInteraction,
  numOfUsersToShow: number = 10,
) {
  await interaction.deferReply();

  const client: IGSBot = interaction.client as IGSBot;

  if (!interaction.guildId || !interaction.guild)
    throw Error("/Leaderbaord not on server");

  const users = await getScores(client, interaction.guildId);

  const topUsers = users
    .sort((a, b) => b.score - a.score)
    .slice(0, numOfUsersToShow);

  let validUsers = [];

  for (const user of topUsers) {
    try {
      //Try first to get the members from cache, if that fails fall back to the slow way!
      const member =
        interaction.guild.members.cache.get(user.userId) ||
        (await interaction.guild.members.fetch(user.userId));
      user.name = member.displayName;
      validUsers.push(user);
    } catch (DiscordAPIError) {
      user.name = "temp";
      validUsers.push(user);
      continue;
    }
  }

  if (validUsers.length < 1) {
    interaction.editReply("No users on the leaderboard");
    return;
  }

  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle("Leaderboard")
    .setDescription(
      validUsers
        .sort((a, b) => b.score - a.score)
        .map((user, index) => `#${index + 1} ${user.name}: ${user.score}`)
        .join("\n"),
    );

  interaction.editReply({ embeds: [embed] });
}

export async function addPuzzle(
  client: IGSBot,
  guildId: string,
  provider: Providers,
  puzzleId: string | number,
  postion?: number,
): Promise<boolean> {
  //Check to make sure puzzle is valid by getting what would be an active puzzle
  const puzzleProvider = client.providerRegistry.get(provider);
  const puzzle = await puzzleProvider.fetchPuzzle(puzzleId);

  if (!puzzle) return false;

  return await addPuzzleToQueue(
    client,
    guildId,
    { source: provider, puzzleId: puzzleId },
    postion ?? undefined,
  );
}
