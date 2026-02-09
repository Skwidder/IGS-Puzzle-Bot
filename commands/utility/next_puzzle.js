const { nextPuzzle } = require("../../databaseManager.js")
const { SlashCommandBuilder, PermissionFlagsBits,  InteractionContextType } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('next_puzzle')
		.setDescription('Move the server to next puzzle in the queue. This will remove the current puzzle')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ModerateMembers)
        .setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		let response = {};
		try{
        	response = await nextPuzzle(interaction.client,interaction.guildId);
		}catch(error){
			await interaction.reply(error.message);
			return;
		}
        await interaction.reply(response);
	},
};
