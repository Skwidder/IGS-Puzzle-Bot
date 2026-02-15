import { turnOffSchedule } from '../../ServerManager.js';
import { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } from 'discord.js';


module.exports = {
    data: new SlashCommandBuilder()
        .setName('schedule_puzzle')
        .setDescription('Schedule automatic puzzle advancement')
        .addSubcommand(subcommand =>
            subcommand
                .setName('daily')
                .setDescription('Schedule puzzles to advance daily at midnight')
                .addChannelOption(option => 
                    option
                        .setName('channel')
                        .setDescription('Channel for the announcement (if left blank, no announcement will be made)')
                        .setRequired(false))
                .addRoleOption(option => 
                    option
                        .setName('role')
                        .setDescription('Role to ping about the announcement')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('weekly')
                .setDescription('Schedule puzzles to advance weekly on Sunday')
                .addChannelOption(option => 
                    option
                        .setName('channel')
                        .setDescription('Channel for the announcement (if left blank, no announcement will be made)')
                        .setRequired(false))
                .addRoleOption(option => 
                    option
                        .setName('role')
                        .setDescription('Role to ping about the announcement')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('custom')
                .setDescription('Set a custom schedule using cron expression')
                .addStringOption(option =>
                    option
                        .setName('cron')
                        .setDescription('Cron expression (e.g., "0 0 * * *" for daily at midnight)')
                        .setRequired(true))
                .addChannelOption(option => 
                    option
                        .setName('channel')
                        .setDescription('Channel for the announcement (if left blank, no announcement will be made)')
                        .setRequired(false))
                .addRoleOption(option => 
                    option
                        .setName('role')
                        .setDescription('Role to ping about the announcement')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('off')
                .setDescription('Turn off scheduled advancement'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;
        const channel = interaction.options.getChannel('channel');
        let role = interaction.options.getRole('role');
        
        let cronExpression = "";

        switch (subcommand) {
            case 'daily':
                cronExpression = '0 0 * * *'; // Every day at midnight
                break;
            case 'weekly':
                cronExpression = '0 0 * * 0'; // Every Sunday at midnight
                break;
            case 'custom':
                const customCron = interaction.options.getString('cron');
                    cronExpression = customCron;
                break;
            case 'off':
                turnOffSchedule(interaction);
        }

    },
};