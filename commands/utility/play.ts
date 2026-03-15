import { InteractionContextType, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { IGSBot } from "../../IGSBot";
import { playerPlay } from "../../PlayerManager";
import { interactionReply } from "../../discordManager";

const data = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Allows you to play this puzzle')
    .setContexts(InteractionContextType.Guild)

async function execute(interaction: ChatInputCommandInteraction) {
    playerPlay(interaction);
    interactionReply(interaction, "Check DM for puzzle!")
}

export default { data, execute};