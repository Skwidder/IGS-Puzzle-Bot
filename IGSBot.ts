import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import { MongoClient, Db } from "mongodb";


export class IGSBot extends Client {
    public commands = new Collection<string, any>();
    public db!: Db;
    private mongo: MongoClient;

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
        })

        this.mongo = new MongoClient(Bun.env.DBCONNSTRING);
    }

    async start() {
        await this.mongo.connect();
        this.db = this.mongo.db('Puzzle_Bot');

        console.log("Mongo DB Connected");

        await this.login(Bun.env.DISCORD_TOKEN);

        console.log("Discord Bot Logged In");
    }

}