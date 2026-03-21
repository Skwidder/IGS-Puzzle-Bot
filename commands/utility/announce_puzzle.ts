import {
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { IGSBot } from "../../IGSBot";
import { annoucePuzzle } from "../../ServerManager";
import { interactionReply } from "../../discordManager";

const data = new SlashCommandBuilder()
  .setName("announce_puzzle")
  .setDescription("Announces the puzzle on the given channel")
  .addChannelOption((option) =>
    option
      .setName("channel")
      .setDescription("channel for the annoucment to go to")
      .setRequired(true),
  )
  .addRoleOption((option) =>
    option.setName("role").setDescription("Role to ping about the annoucment"),
  )
  .setDefaultMemberPermissions(
    PermissionFlagsBits.Administrator | PermissionFlagsBits.ModerateMembers,
  )
  .setContexts(InteractionContextType.Guild);

async function execute(interaction: ChatInputCommandInteraction) {
  const client: IGSBot = interaction.client as IGSBot;
  const channelId = interaction.options.getChannel("channel")?.id;
  const role = interaction.options.getRole("role");
  let roleId: string | undefined = undefined;
  if (role) {
    roleId = role.id;
  }

  if (!interaction.guildId) throw Error("/announce_puzzle not on a server");
  const response = await annoucePuzzle(
    client,
    interaction.guildId,
    channelId,
    roleId,
  );

  switch (response) {
    case "NO_PERMISSIONS":
      interactionReply(
        interaction,
        "Bot does not have permissions in that channel",
      );
      break;
    case "NO_PUZZLE":
      interactionReply(
        interaction,
        "No active puzzles, please use /next_puzzle to set an active puzzle",
      );
      break;
    case null:
      interactionReply(interaction, "Error, report on github");
      break;
    default:
      interactionReply(interaction, "Announcement made");
      break;
  }
}

export default { data, execute };
