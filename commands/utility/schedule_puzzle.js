const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const schedule = require('node-schedule');
const cronValidator = require('cron-validator');
const {annoucePuzzle} = require("../../display.js")
const {nextPuzzle } = require("../../databaseManager.js");


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

        // Get the database connection
        const clientdb = interaction.client.dbconn.db("Puzzle_Bot");
        const serverColl = clientdb.collection("servers");

        // Cancel existing job if it exists
        if (interaction.client.scheduledJobs?.[guildId]) {
            interaction.client.scheduledJobs[guildId].cancel();
        }

        let cronExpression;
        let scheduleDescription;

        switch (subcommand) {
            case 'daily':
                cronExpression = '0 0 * * *'; // Every day at midnight
                scheduleDescription = 'daily at midnight';
                break;
            case 'weekly':
                cronExpression = '0 0 * * 0'; // Every Sunday at midnight
                scheduleDescription = 'weekly on Sunday at midnight';
                break;
            case 'custom':
                const customCron = interaction.options.getString('cron');
                
                if (!cronValidator.isValidCron(customCron)) {
                    await interaction.reply({
                        content: 'Error: Invalid cron expression. Please use valid cron syntax.',
                        ephemeral: true
                    });
                    return;
                }
                    cronExpression = customCron;
                    scheduleDescription = "Custom schedule: `" + customCron + "`";
                break;
            case 'off':
                // Update database to remove scheduling
                await serverColl.updateOne(
                    { serverId: guildId },
                    { 
                        $unset: { 
                            scheduleExpression: "",
                            announcementChannel: "",
                            announcementRole: ""
                        } 
                    }
                );
                await interaction.reply('Puzzle advancement scheduling has been turned off.');
                return;
        }

        if (cronExpression) {
            // Save the schedule and announcement settings to the database
            const updateDoc = {
                scheduleExpression: cronExpression
            };

            if (channel) {
                updateDoc.announcementChannel = channel.id;
            }else{
                updateDoc.announcementChannel = "";
            }

            if (role) {
                updateDoc.announcementRole = role.id;
                role = role.id;
            }else{
                updateDoc.announcementRole = "";
            }

            await serverColl.updateOne(
                { serverId: guildId },
                { $set: updateDoc }
            );

        }

        // Create the scheduled job
        interaction.client.scheduledJobs = interaction.client.scheduledJobs || {};
        interaction.client.scheduledJobs[guildId] = schedule.scheduleJob(cronExpression, async () => {
            try{
                await nextPuzzle(interaction.client,interaction.guildId);
            }catch(error){
                console.error("Server: " + interaction.guild.name + " Has no queue or approved collections at scheduled time");

                if (channel == "" || channel == undefined || channel == null){
                    return;
                }
                channel.send({content: error.message});
                return;
            }

            if (channel == "" || channel == undefined || channel == null){
                return;
            }

            annoucePuzzle(interaction.client,interaction.guildId,channel.id,role);
        });

        // console.log(test);
        await interaction.reply(scheduleDescription);
    },
};