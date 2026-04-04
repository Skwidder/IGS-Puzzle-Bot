import {
  InteractionContextType,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { IGSBot } from "../../IGSBot";
import { playerPlay } from "../../PlayerManager";
import { interactionReply } from "../../discordManager";

const data = new SlashCommandBuilder()
  .setName("play")
  .setDescription("Allows you to play this puzzle")
  .setContexts(InteractionContextType.Guild);

async function execute(interaction: ChatInputCommandInteraction) {
  try {
    await playerPlay(interaction);
  } catch (error) {
    if(error.message === "Server has not active puzzle!") {
      interactionReply(interaction, "Server has no active puzzle ask admin to add one");
      return;
    } else {
      throw error;
    }
  }
  
  interactionReply(interaction, "Check DM for puzzle!");
}

export default { data, execute };
