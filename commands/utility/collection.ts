import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction } from "discord.js";


const data = new SlashCommandBuilder()
    .setName("collection")
    .setDescription("Auto-complete Test")
    .addSubcommand(subcommand =>
        subcommand
            .setName('add')
            .setDescription('add a OGS collection to appoved collection lists')
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
                    .setDescription("Can be a collection name, ID, or search string depending on the website")
                    .setRequired(true)
                    .setAutocomplete(true)
            )
        );
                

async function execute(interaction: ChatInputCommandInteraction){
    await interaction.reply("test");
}

export default { data, execute };