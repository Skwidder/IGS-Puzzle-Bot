import {
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { resetLeaderboard } from "../../databaseManager";
import { interactionReply } from "../../discordManager";
import type { IGSBot } from "../../IGSBot";

const data = new SlashCommandBuilder()
  .setName("reset_leaderboard")
  .setDescription("Reset leaderboard, All time leaderboard will not reset")
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function execute(interaction: ChatInputCommandInteraction) {
  const client: IGSBot = interaction.client as IGSBot;
  if (!interaction.guildId) throw Error("/leadbaord reset not on server");

  resetLeaderboard(interaction.client as IGSBot, interaction.guildId);
  interactionReply(interaction, "Leadboard reset!");
}

export default { data, execute };
