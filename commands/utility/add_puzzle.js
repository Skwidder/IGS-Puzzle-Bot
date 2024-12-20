const { getPuzzle } = require("../../OGS.js");
const { SlashCommandBuilder, Attachment, PermissionFlagsBits, InteractionContextType } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add_puzzle')
		.setDescription('Displays a image of the puzzle with the given ID')
        .addIntegerOption(option => 
			option
				.setName('id')
				.setDescription("ID of the puzzle to add to server queue")
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ModerateMembers)
        .setContexts(InteractionContextType.Guild),
	async execute(interaction) {
        id = interaction.options.getInteger('id');
        if(isNaN(id)){
            await interaction.reply("Id must be a number");
            return;
        }

        try{
            response = await getPuzzle(id);
        }catch(error){
            await interaction.reply("Error getting puzzle, puzzle may be private");
            return;
        }

        const clientdb = interaction.client.dbconn.db("Puzzle_Bot");
        const coll = clientdb.collection("servers");
        await coll.updateOne(
            {serverId : interaction.guild.id},
            {
                $push: {
                    puzzle_queue: id
                }
            }
        )

        await interaction.reply("Puzzle: " + id + " successfully added to queue!");
	},
};
