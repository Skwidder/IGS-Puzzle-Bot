import { ActionRowBuilder, ComponentBuilder, InteractionResponse,  MessageFlags,  StringSelectMenuBuilder,  StringSelectMenuComponent,  type ActionRowComponent,  type AnyComponentBuilder,  type Message, type MessageActionRowComponentBuilder, type RepliableInteraction, type User } from "discord.js";
import type { EmbedPackage } from "./MessageBuilder";
import type { ActivePuzzle, ServerConfig } from "./databaseManager";

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