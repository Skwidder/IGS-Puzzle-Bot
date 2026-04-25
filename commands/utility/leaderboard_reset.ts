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
  .addIntegerOption((option) =>
    option
      .setName("numresults")
      .setDescription(
        "The number of players to show on the leaderboard, defaults to 10",
      )
      .setRequired(false),
  )
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function execute(interaction: ChatInputCommandInteraction) {
  const client: IGSBot = interaction.client as IGSBot;
  if (!interaction.guildId) throw Error("/leadbaord reset not on server");

  let num = interaction.options.getInteger("numresults");
  if (num == null) {
    num = 10;
  }
  if (num < 0) {
    await interaction.reply("Number must be greater than 0");
    return;
  }
  resetLeaderboard(interaction, num);
}

export default { data, execute };
