import { Events, MessageFlags, type Interaction } from "discord.js"
import { runAndSendBoard } from "../display.js";
import type { IGSBot } from "../IGSBot.js";

export default {
	name: Events.InteractionCreate,
	async execute(interaction: Interaction) {
		const client: IGSBot = interaction.client as IGSBot;
		if (interaction.isChatInputCommand()){
			const command = client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
				} else {
					await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
				}
			}
		}else if(interaction.isAnySelectMenu()){
			// console.log(interaction);

			if (interaction.customId === 'puzzle_select') {
				await interaction.update({ content: 'Puzzle Selected!', components: [] });

				await client.usersCol.updateOne({ 
                    "userId" : interaction.user.id,
                    "guilds.guildId" : interaction.values[0]
                }, { $set : {
                    "guilds.$.active" : 1
                }});

				runAndSendBoard(interaction.client,interaction.user.id,"",true,true);
			}
		}
	},
};
