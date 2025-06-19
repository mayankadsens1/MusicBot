/**********************************************************
* @Author:
  Leo and CodeX Team

* @Community:
  https://discord.gg/codexdev (CodeX Development)
 *********************************************************/

console.log((`
 ▄████▄   ▒█████  ▓█████▄ ▓█████ ▒██   ██▒
▒██▀ ▀█  ▒██▒  ██▒▒██▀ ██▌▓█   ▀ ▒▒ █ █ ▒░
▒▓█    ▄ ▒██░  ██▒░██   █▌▒███   ░░  █   ░
▒▓▓▄ ▄██▒▒██   ██░░▓█▄   ▌▒▓█  ▄  ░ █ █ ▒ 
▒ ▓███▀ ░░ ████▓▒░░▒████▓ ░▒████▒▒██▒ ▒██▒
░ ░▒ ▒  ░░ ▒░▒░▒░  ▒▒▓  ▒ ░░ ▒░ ░▒▒ ░ ░▓ ░
  ░  ▒     ░ ▒ ▒░  ░ ▒  ▒  ░ ░  ░░░   ░▒ ░
░        ░ ░ ░ ▒   ░ ░  ░    ░    ░    ░  
░ ░          ░ ░     ░       ░  ░ ░    ░  
░                  ░                     
`));

// Run npm install first
const { execSync } = require('child_process');
try {
    console.log("Installing dependencies...");
    execSync('npm install', { stdio: 'inherit' });
    console.log("Dependencies installed successfully");
} catch (err) {
    console.error(`Failed to install dependencies: ${err.message}`);
    process.exit(1);
}

// Now require the rest of the dependencies
const { Client, GatewayIntentBits, GatewayDispatchEvents } = require("discord.js");
const { readdirSync } = require("fs");
const { CommandKit } = require("commandkit");
const { connect } = require("mongoose");
const { logger } = require("./utils/logger");
const { Riffy } = require("riffy");
const SpotifyWebApi = require('spotify-web-api-node');
const config = require("./config");
const path = require("path");

class CodeXBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
            ],
        });

        this.client.spotify = new SpotifyWebApi({
            clientId: config.spotify.clientId,
            clientSecret: config.spotify.clientSecret
        });
        
        this.initializeRiffy();
        this.initializeCommandKit();
    }

    initializeRiffy() {
        this.client.riffy = new Riffy(
            this.client,
            config.riffyNodes,
            {
                ...config.riffyOptions,
                send: (payload) => {
                    const guild = this.client.guilds.cache.get(payload.d.guild_id);
                    if (guild) guild.shard.send(payload);
                },
            },
        );

        this.client.on("raw", (d) => {
            if (![GatewayDispatchEvents.VoiceStateUpdate, GatewayDispatchEvents.VoiceServerUpdate].includes(d.t)) return;
            this.client.riffy.updateVoiceState(d);
        });
    }

    initializeCommandKit() {
        new CommandKit({
            client: this.client,
            commandsPath: path.join(__dirname, "commands"),
            eventsPath: path.join(__dirname, "./events/botEvents"),
            validationsPath: path.join(__dirname, "validations"),
            devGuildIds: config.clientOptions.devGuild,
            devUserIds: config.clientOptions.devId,
        });

        const mentionReply = require('./events/messageCreate/mentionReply');
        this.client.on('messageCreate', mentionReply);
    }

    async start() {
        const { execSync } = require('child_process');
        try {
            logger("Installing dependencies...", "warn");
            execSync('npm install', { stdio: 'inherit' });
            logger("Dependencies installed successfully", "success");
        } catch (err) {
            logger(`Failed to install dependencies: ${err.message}`, "error");
            process.exit(1);
        }

        await this.checkConfig();
        await this.loadRiffy();
        await this.loadDb();
        await this.getSpotifyAccessToken();

        try {
            await this.client.login(config.clientOptions.clientToken);
        } catch (err) {
            logger(`Failed to log in: ${err.message}`, "error");
            process.exit(1);
        }

        setInterval(() => {
            this.getSpotifyAccessToken();
        }, 3000000);
    }

    async checkConfig() {
        const requiredFields = [
            'clientToken',
            'clientId',
            'embedColor',
            'mongoUri',
            'devId',
            'devGuild',
            'defaultSearchPlatform',
            'spotify.clientId',
            'spotify.clientSecret',
            'riffyNodes'
        ];
    
        const missingFields = [];
    
        requiredFields.forEach(field => {
            const keys = field.split('.');
            let value = config;
    
            for (const key of keys) {
                value = value[key];
                if (value === undefined) {
                    break;
                }
            }
    
            if (value === "" || value === null || (Array.isArray(value) && value.length === 0)) {
                missingFields.push(field);
            }
        });
    
        if (Array.isArray(config.clientOptions.devId) && config.clientOptions.devId.length === 0) {
            missingFields.push('devId');
        }
        if (Array.isArray(config.clientOptions.devGuild) && config.clientOptions.devGuild.length === 0) {
            missingFields.push('devGuild');
        }
    
        if (missingFields.length > 0) {
            logger(`Missing required configuration fields: ${missingFields.join(', ')}`, "error");
            process.exit(1);
        } else {
            logger("All required configuration fields are filled", "success");
        }
    }

    async loadDb() {
        try {
            await connect(config.clientOptions.mongoUri);
            logger(`Successfully connected to MongoDB`, "debug");
        } catch (err) {
            logger(`Failed to connect to MongoDB: ${err}`, "error");
            process.exit(1);
        }
    }

    async loadRiffy() {
        logger("Initiating Riffy events", "warn");
    
        const eventDirs = readdirSync('./events/riffyEvents');
    
        for (const dir of eventDirs) {
            const eventFiles = readdirSync(`./events/riffyEvents/${dir}`).filter(file => file.endsWith('.js'));
    
            for (const file of eventFiles) {
                try {
                    const event = require(`./events/riffyEvents/${dir}/${file}`);
    
                    if (typeof event !== 'function') {
                        logger(`Couldn't load the Riffy event ${file}, error: Exported value is not a function.`, "error");
                        continue;
                    }
    
                    await event(this.client);
                } catch (err) {
                    logger(`Couldn't load the Riffy event ${file}, error: ${err}`, "error");
                    logger(err, "error");
                    continue;
                }
            }
        }
        this.client.riffy.init(config.clientOptions.clientId)
        logger(`Successfully initiate Riffy events`, "debug");
    }

    async getSpotifyAccessToken() {
        try {
            const data = await this.client.spotify.clientCredentialsGrant();
            logger("Successfully retrieved fresh Spotify access token", "success");
            this.client.spotify.setAccessToken(data.body['access_token']);
        } catch (err) {
            logger(`Error retrieving Spotify access token: ${err}`);
        }
    }
}

const CodeX = new CodeXBot();
CodeX.start()

/**********************************************************
* @Author:
  Leo and CodeX Team

* @Community:
  https://discord.gg/codexdev (CodeX Development)
 *********************************************************/