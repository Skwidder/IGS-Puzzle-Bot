import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction } from "discord.js";


const data = new SlashCommandBuilder()
    .setName("puzzle")
    .setDescription("Puzzle Add")
    .addSubcommand(subcommand =>
        subcommand
            .setName('add')
            .setDescription('Add a puzzle to the queue')
            .addStringOption(option =>
                option
                    .setName('postion')
                    .setDescription('Where in the queue should it be added')
                    .addChoices(
                        {name: 'Next', value: 'next'},
                        {name: 'Last', value: 'last'},
                    )
                    .setRequired(true)
            )
            .addStringOption(option => 
                option
                    .setName('website')
                    .setDescription("The website that will be used")
                    .setRequired(true)
                    .setAutocomplete(true)
                ) 
            .addStringOption(option =>
                option
                    .setName('search')
                    .setRequired(true)
                    .setDescription("Can be a collection name, ID, or search string depending on the website")
                    .setAutocomplete(true)
            )
        );
                

async function execute(interaction: ChatInputCommandInteraction){
    await interaction.reply("test");
}

export default { data, execute }