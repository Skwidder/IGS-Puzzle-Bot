import { InteractionContextType, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { IGSBot } from "../../IGSBot";
import { playerPlay } from "../../PlayerManager";

const data = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Allows you to play this puzzle')
    .setContexts(InteractionContextType.Guild)

async function execute(interaction: ChatInputCommandInteraction) {
    playerPlay(interaction);
}

export default { data, execute};