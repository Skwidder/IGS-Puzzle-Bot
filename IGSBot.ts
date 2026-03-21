import { Client, Collection, GatewayIntentBits, Partials, UserManager } from "discord.js";
import { MongoClient, Db, Collection as MongoCollection } from "mongodb";
import type { Job } from "node-schedule";
import { ensureAllServersExist, getAllServers, setSchedule, type ServerConfig, type UserDocument } from "./databaseManager";
import { Registry } from "./providers/ProviderRegistry";
import { scheduleAnnoucmnet } from "./ServerManager";


export class IGSBot extends Client {
    public commands = new Collection<string, any>();
    private db!: Db;
    private mongo!: MongoClient;
    public serverCol!: MongoCollection<ServerConfig>;
    public usersCol!: MongoCollection<UserDocument>
    public scheduledJobs: Record<string, Job> = {}; 
    public providerRegistry: Registry = new Registry();
 
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

        this.mongo = new MongoClient(Bun.env.DBCONNSTRING || "");
    }

    async start() {
        await this.mongo.connect();
        this.db = this.mongo.db('Puzzle_Bot');
        this.serverCol = this.db.collection<ServerConfig>("servers");
        this.usersCol = this.db.collection<UserDocument>("users");

        console.log("Mongo DB Connected");

        await this.login(Bun.env.DISCORD_TOKEN);

        await ensureAllServersExist(this);
        await this.scheduleJobs();
    }

    async scheduleJobs() {
        const servers = await getAllServers(this);

        for (const server of servers){
            const guildId = server.serverId;
            const scheduleExpression = server.scheduleExpression;
            const channel = server.announcementChannel;
            const role = server.announcementRole;

            if(!scheduleExpression || !channel)
                continue;

            scheduleAnnoucmnet(this, server.serverId, scheduleExpression, channel, role ?? undefined);
        }
    }
}