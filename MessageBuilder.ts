//Dont forget to do the image

import {AttachmentBuilder, EmbedBuilder, type APIEmbedField } from "discord.js";
import type { ActivePuzzle } from "./databaseManager";
import type { IGSBot } from "./IGSBot";

export interface EmbedPackage {
    embed?: EmbedBuilder
    attachment?: AttachmentBuilder
}

export function embedPackager(embed: EmbedBuilder, imagePath?: string): EmbedPackage {
    let file!: AttachmentBuilder;
    if(imagePath) {
        file = new AttachmentBuilder(imagePath);

        embed.setImage(`attachment://${imagePath}`);
    }

    return {embed: embed, attachment: file ?? undefined}
}

export function infoToEmbedFields(client: IGSBot, puzzle: ActivePuzzle, howToPlay: boolean = false,
   showHelp: boolean = false, puzzleLink: boolean = false 
): APIEmbedField[] {
    let feilds: APIEmbedField[] = [];
    

    const provider = client.providerRegistry.get(puzzle.source);

    let sourceText = ""
    if(puzzleLink){
        sourceText = `[${provider.name}](${provider.baseURL}/${puzzle.puzzleId}): ${puzzle?.collectionName ?? ""} By ${puzzle.author}\n\n`;
    } else {
        sourceText = `${provider.name}: ${puzzle?.collectionName ?? ""} By ${puzzle.author}\n\n`;
    }

    feilds.push({
        name: "Source",
        value: sourceText,
        inline: true
    });


    //Discord Embed dose not allow a feild to be longer than 1024 characters,
    //so if the description is longer than that lets just set it to nothing
    let description = puzzle.description + "\n\n";
    if(description.length <= 1024){
        feilds.push({
            name: "Description",
            value:  description + "\n\n",
            inline: true
        });
    }
    
    if(showHelp){
        feilds.push({name: "How To Use", value: "Use !Location to play a move (eg. !B17) \nUse !reset to reset puzzle to starting setup \n" +
            "Use !undo to undo last move"
        });
    }

    if(howToPlay){
        feilds.push({name:"How To Play",value:"Just type /play"});
    }

    return feilds;
}

export function embedMaker(fields: APIEmbedField[]): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle("Today's Puzzle!")
        .addFields(fields)
        .setTimestamp();
}