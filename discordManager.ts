import { ActionRowBuilder, AutocompleteInteraction, ComponentBuilder, InteractionResponse,  MessageFlags,  StringSelectMenuBuilder,  StringSelectMenuComponent,  TextChannel,  type ActionRowComponent,  type AnyComponentBuilder,  type AutocompleteFocusedOption,  type GuildBasedChannel,  type Message, type MessageActionRowComponentBuilder, type RepliableInteraction, type User } from "discord.js";
import type { EmbedPackage } from "./MessageBuilder";
import { getServer, type ActivePuzzle, type ServerConfig } from "./databaseManager";
import type { IGSBot } from "./IGSBot";
import { channel } from "node:diagnostics_channel";
import type { PuzzleProvider } from "./providers/PuzzleProvider";
import type { Providers } from "./providers/ProviderRegistry";

export async function sendUserDM(user: User, text: string = "", embedPackage?: EmbedPackage): Promise<null | Message> {
    try {
        return await user.send({
            content: text, 
            embeds: embedPackage?.embed ? [embedPackage.embed] : [],
            files: embedPackage?.attachment ? [embedPackage.attachment] : []});
    } catch (error){
        console.log((error as Error).message);
        return null;
    }
}

export async function interactionReply(interaction: RepliableInteraction, text: string = "", embedPackage?: EmbedPackage, ephemeral: Boolean = true)
    : Promise<null | InteractionResponse> {
    try {
        return await interaction.reply({
            content: text, 
            embeds: embedPackage?.embed ? [embedPackage.embed] : [],
            files: embedPackage?.attachment ? [embedPackage.attachment] : [],
            flags: ephemeral ? [MessageFlags.Ephemeral] : undefined
        });
    } catch (error){
        console.log((error as Error).message);
        return null;
    }
}


export async function sendPuzzleSelectorMenu(user: User, inProgressServers: ServerConfig[]){
    //Want to allow the user to pick what puzzle to play if they have more than one
    if(inProgressServers.length > 1){
        const menu: StringSelectMenuBuilder = new StringSelectMenuBuilder()
        .setCustomId('puzzle_select')
        .addOptions(inProgressServers.map(p => ({
            label: `Puzzle ${p.name}`,
            value: p.serverId
        })));

        const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(menu);

        await user.send({
            content: 'You have multiple in progress puzzles which would you like to do?',
            components: [row],
        });
    }
}

export async function sendAnnounceChannelMessage(client: IGSBot, 
    serverId: string, 
    text: string = "", 
    embedPackage?: EmbedPackage, 
    channelId? :string):
    Promise<Message | null> {

    const server: ServerConfig | null = await getServer(client, serverId);
    if(!server || !server?.announcementChannel) return null;

    return await sendChannelMessage(client, channelId ?? server.announcementChannel, text, embedPackage);
}

export async function sendChannelMessage(client: IGSBot, channelId: string, text: string = "", embedPackage?: EmbedPackage):
    Promise<Message | null> {
    // const guild = await client.guilds.fetch(serverId);
    // if (!guild) {
    // console.log(`Not seeing ${serverId} Bot may have been kicked`);
    // }

    // const channel: GuildBasedChannel | null = await guild.channels.fetch(channelId);
    const channel = await client.channels.fetch(channelId);
if ((!channel || !channel?.isTextBased())  && channel?.isDMBased()) return null;

    let textChannel: TextChannel = channel as TextChannel;

     try {
        return await textChannel?.send({
            content: text, 
            embeds: embedPackage?.embed ? [embedPackage.embed] : [],
            files: embedPackage?.attachment ? [embedPackage.attachment] : []});
    } catch (error){
        console.log((error as Error).message);
        return null;
    }
}

export async function autocompleteHandler(interaction: AutocompleteInteraction){
   if(!interaction.isAutocomplete()) return;

    let subcommand = interaction.options.getSubcommand();
    let results: {name: string, value: string}[] | null = null;

    if(subcommand === 'add'){
        results = await addAutoCompleteHandeler(interaction);
    } else if(subcommand === 'remove') {
        results = await removeAutoCompleteHandler(interaction);
    }

    if (!results) {
        return interaction.respond([
            { name: "Something went wrong", value: "none" }
        ]);
    }   
    interaction.respond(results.slice(0,25)).catch(() => {});
}



async function addAutoCompleteHandeler(interaction: AutocompleteInteraction): Promise<{name: string, value: string}[] | null> {
    if(interaction.commandName !== 'collection' && interaction.commandName !== 'puzzle') return null;

    const focusedOption: AutocompleteFocusedOption = interaction.options.getFocused(true);
    const client: IGSBot = interaction.client as IGSBot;

    if(focusedOption.name === 'website'){
        //send out all websites we have
        return client.providerRegistry.getAllNames();
    } 

    if (focusedOption.name === 'search') {
        const website = interaction.options.getString('website');
        if(!website) {
            return [{value: "1", name: "Please select a website first!"}];
        }

        const provider = client.providerRegistry.get(website as Providers);
        if (!provider) {
            return [
                { name: `Website: ${website} not found, Please select one from the list`, value: "none" }
            ];
        }

        if(interaction.commandName === 'collection'){
            return await provider.collectionAutocomplete(focusedOption);
        } else if (interaction.commandName === 'puzzle'){
            //TODO: add puzzle autocomplete
            // results = await provider.puzzleAutocomplete(focusedOption);
        }
    }
    return null;
}

async function removeAutoCompleteHandler(interaction: AutocompleteInteraction): Promise<{name: string, value: string}[] | null> {
    // if(interaction.commandName !== 'collection' && interaction.commandName !== 'puzzle') return null;
    const focusedOption: AutocompleteFocusedOption = interaction.options.getFocused(true);
    const client: IGSBot = interaction.client as IGSBot;
    if(focusedOption.name !== 'remove') return null;

    if(!interaction.guildId) return null;
    const server = await getServer(client, interaction.guildId);
    if(!server) return null;
    
    if(interaction.commandName === "collection"){
        return server.collection_sources.map(collection => {
            const provider = client.providerRegistry.get(collection.source);
            return {
                name: `${provider.name}: ${collection.name}`,
                value: `${provider.slug}|${collection.name}`
            }
        });
    } else if(interaction.commandName === "puzzle"){
        return server.puzzle_queue.map(puzzle => {
            const provider = client.providerRegistry.get(puzzle.source);
            return {
                name: `${provider.name}: ${puzzle.puzzleId}`,
                //make like a little baby JSON
                value: `{${puzzle.source}|${puzzle.puzzleId}}`
            }
        });
    }
    return null;
}

