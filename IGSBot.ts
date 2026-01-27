import { Client, Collection, GatewayIntentBits, Partials, UserManager } from "discord.js";
import { MongoClient, Db, Collection as MongoCollection } from "mongodb";
import * as schedule from "node-schedule";
import { annoucePuzzle } from "./display";
import { ensureAllServersExist, type ServerConfig, type UserDocument } from "./database";
import { advanceToNextPuzzle } from './ServerManager';
import { type NextPuzzleResult } from "./ServerManager";


export class IGSBot extends Client {
    public commands = new Collection<string, any>();
    private db!: Db;
    private mongo!: MongoClient;
    public serverCol!: MongoCollection<ServerConfig>;
    public usersCol!: MongoCollection<UserDocument>
    public scheduledJobs: Record<string, schedule.Job> = {}; 

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers],
            partials: [
                Partials.Channel
            ]
        });

        this.mongo = new MongoClient(Bun.env.DBCONNSTRING!);
    }

    async start() {
        await this.mongo.connect();
        this.db = this.mongo.db('Puzzle_Bot');
        this.serverCol = this.db.collection<ServerConfig>("servers");
        this.usersCol = this.db.collection<UserDocument>("users");

        console.log("Mongo DB Connected");

        await this.login(Bun.env.DISCORD_TOKEN);

        console.log("Discord Bot Logged In");

        await ensureAllServersExist(this);
        await this.scheduleJobs();
    }

    async scheduleJobs() {
        const servers = await this.serverCol.find({}).toArray()

        for (const server of servers){
            const guildId = server.serverId;
            const scheduleExpression = server.scheduleExpression;
            const channel = server.announcementChannel;
            const role = server.announcementRole;

            if(!scheduleExpression)
                continue;

            // Create the scheduled job
            this.scheduledJobs = this.scheduledJobs || {};
            this.scheduledJobs[guildId] = schedule.scheduleJob(scheduleExpression, async () => {
                try{
                    await advanceToNextPuzzle(this,guildId);
                }catch(error){
                    console.error(`Server: ${server.name} has no queue or approved collections at scheduled time`);
                    return;
                }

                if (!channel){
                    return;
                }

                annoucePuzzle(this,guildId,channel,role ?? undefined);
            });

            console.log(`Creating Schedule for ${server.name} to Run at: ${scheduleExpression}`);
        }
    }
}