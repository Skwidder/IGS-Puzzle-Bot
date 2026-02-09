//Dont forget to do the image

import {AttachmentBuilder, type EmbedBuilder } from "discord.js";

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
