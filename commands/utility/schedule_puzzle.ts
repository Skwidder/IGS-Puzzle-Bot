import { interactionReply } from "../../discordManager.js";
import type { IGSBot } from "../../IGSBot.js";
import {
  newSchedule,
  scheduleAnnoucmnet,
  turnOffSchedule,
} from "../../ServerManager.js";
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  InteractionContextType,
  ChatInputCommandInteraction,
} from "discord.js";

const data = new SlashCommandBuilder()
  .setName("schedule_puzzle")
  .setDescription("Schedule automatic puzzle advancement")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("daily")
      .setDescription("Schedule puzzles to advance daily at midnight")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription(
            "Channel for the announcement (if left blank, no announcement will be made)",
          )
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("Role to ping about the announcement")
          .setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("weekly")
      .setDescription("Schedule puzzles to advance weekly on Sunday")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription(
            "Channel for the announcement (if left blank, no announcement will be made)",
          )
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("Role to ping about the announcement")
          .setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("custom")
      .setDescription("Set a custom schedule using cron expression")
      .addStringOption((option) =>
        option
          .setName("cron")
          .setDescription(
            'Cron expression (e.g., "0 0 * * *" for daily at midnight)',
          )
          .setRequired(true),
      )
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription(
            "Channel for the announcement (if left blank, no announcement will be made)",
          )
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("Role to ping about the announcement")
          .setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("off").setDescription("Turn off scheduled advancement"),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild);

async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const channel = interaction.options.getChannel("channel");
  let role = interaction.options.getRole("role");

  if (!channel) interactionReply(interaction, "Must specify a channel");

  let cronExpression = "";

  if (!interaction.guildId) throw Error("/schedule_puzzle not on a server");

  switch (subcommand) {
    case "daily":
      cronExpression = "0 0 * * *"; // Every day at midnight

      break;
    case "weekly":
      cronExpression = "0 0 * * 0"; // Every Sunday at midnight
      break;
    case "custom":
      const customCron = interaction.options.getString("cron");
      if (!customCron) {
        interactionReply(interaction, "Invalid Input");
        return;
      }
      cronExpression = customCron;
      break;
    case "off":
      turnOffSchedule(interaction);
      return;
  }

  const results = await newSchedule(
    interaction,
    cronExpression,
    channel?.id ?? "",
    role?.id ?? "",
  );
  switch (results) {
    case "CRON_INVALID":
      interactionReply(interaction, "Cron Invalid");
      return;
    case "INVALID_CHANNEL":
      interactionReply(interaction, "Invalid channel");
      return;
    case "INVALID_SERVER":
      interactionReply(interaction, "Invalid Server, Please report on github");
      throw Error(`[New Schedule]: Invalid Server ${interaction.guildId}`);
    case "NO_PERMISSIONS":
      interactionReply(
        interaction,
        "Bot dose not have permission in that channel",
      );
      return;
    default:
      interactionReply(interaction, "Success");
      break;
  }
}

export default { data, execute };
