const { SlashCommandBuilder,  InteractionContextType, PermissionFlagsBits } = require('discord.js');
const { resetLeaderboard } = require('../../databaseManager.js')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reset_leaderboard')
		.setDescription('Reset leaderboard, All time leaderboard will not reset')
		.setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction) {
		resetLeaderboard(interaction.client,interaction.guildId);
        interaction.reply("Leaderboard Reset!");
	},
};
