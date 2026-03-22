import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
} from "discord.js";
import type { IGSBot } from "../../IGSBot";
import { interactionReply } from "../../discordManager";
import { Providers } from "../../providers/ProviderRegistry";
import { addCollection, removeCollection } from "../../databaseManager";

const data = new SlashCommandBuilder()
  .setName("collection")
  .setDescription("Auto-complete Test")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("add a OGS collection to appoved collection lists")
      .addStringOption((option) =>
        option
          .setName("website")
          .setDescription("The website that will be used")
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption((option) =>
        option
          .setName("search")
          .setDescription(
            "Can be a collection name, ID, or search string depending on the website",
          )
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("remove")
      .setDescription("Remove a collection")
      .addStringOption((option) =>
        option
          .setName("remove")
          .setDescription("The collection to remove")
          .setRequired(true)
          .setAutocomplete(true),
      ),
  );

async function execute(interaction: ChatInputCommandInteraction) {
  const client: IGSBot = interaction.client as IGSBot;
  if (!interaction.guildId) throw Error("Puzzle run not on server");

  switch (interaction.options.getSubcommand()) {
    case "add":
      const website = interaction.options.getString("website");
      const addSource = Object.values(Providers).find((p) => p === website);
      if (!addSource) return interactionReply(interaction, "Website Invalid");
      const toAdd = interaction.options.getString("search");
      if (!website || !toAdd)
        return interactionReply(interaction, "Input not valid");

      const provider = client.providerRegistry.get(addSource);
      const collectionResults = await provider.searchCollection(toAdd);

      if (
        collectionResults === "COLLECTION_PRIVATE" ||
        collectionResults === "NO_COLLECTION_FOUND" ||
        collectionResults === "ERROR"
      ) {
        return interactionReply(
          interaction,
          "Collection not found please check name!",
        );
      } else if (collectionResults === "TOO_MANY_COLLECTIONS") {
        return interactionReply(
          interaction,
          "More than one collection found, check name!",
        );
      }

      const result = addCollection(
        client,
        interaction.guildId,
        collectionResults,
      );
      if (!result)
        console.log(
          `[Add Collection] Collection found but add failed ${toAdd}`,
        );

      interactionReply(
        interaction,
        `Collection ${collectionResults.name} from ${provider.name} added!`,
      );
      break;
    case "remove":
      const toRemove = interaction.options.getString("remove");
      if (!toRemove) return interactionReply(interaction, "Input not valid");
      const [sourceStr, collectionName] = toRemove.split("|");

      // Check if the string is a valid value of the Providers enum
      const source = Object.values(Providers).find((p) => p === sourceStr);

      if (!source)
        return interactionReply(interaction, "Invalid Puzzle Source");

      const removeResults = await removeCollection(
        client,
        interaction.guildId,
        source,
        collectionName,
      );
      if (!removeResults)
        interactionReply(
          interaction,
          "Remove fail, if issues presists make a bug report",
        );
      interactionReply(interaction, `${sourceStr}: ${collectionName} removed!`);
      break;
    default:
      throw Error(
        `Collection subcommand not supported: ${interaction.options.getSubcommand()}`,
      );
      break;
  }
}

export default { data, execute };
