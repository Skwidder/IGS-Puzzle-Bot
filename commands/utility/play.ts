import type { ChatInputCommandInteraction } from "discord.js";
import type { IGSBot } from "../../IGSBot";
import { playerPlay } from "../../PlayerManager";

const { SlashCommandBuilder, userMention, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags, InteractionContextType } = require('discord.js');
const { runBoard, wgoGridToImageStones, GoBoardImageBuilder } = require("../../Simulator.js");
const { runAndSendBoard, puzzleSelectorMenu } = require("../../display.js");
const {getInProgessPuzzles} = require("../../databaseManager.js");

	const data = new SlashCommandBuilder()
		.setName('play')
		.setDescription('Allows you to play this puzzle')
        .setContexts(InteractionContextType.Guild)

async function execute(interaction: ChatInputCommandInteraction) {
    playerPlay(interaction);
}

export default { data, execute};