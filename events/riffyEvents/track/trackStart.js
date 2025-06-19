const { 
	ActionRowBuilder, 
	ButtonBuilder, 
	ButtonStyle, 
	EmbedBuilder 
} = require("discord.js");
const { clientOptions } = require("../../../config");
const formatDuration = require("../../../utils/formatDuration");
const guild = require("../../../schemas/guild");
const axios = require('axios');

module.exports = async (client) => {
    client.riffy.on('trackStart', async (player, track) => {
        const createButton = (customId, emoji, style) => 
            new ButtonBuilder().setCustomId(customId).setEmoji(emoji).setStyle(style);

        const getLoopButtonStyle = (loopMode) => {
            if (loopMode === "track") return ButtonStyle.Success;
            if (loopMode === "queue") return ButtonStyle.Primary;
            return ButtonStyle.Secondary;
        };

      
        const updateVoiceStatus = async (status) => {
            try {
                const voiceChannel = client.channels.cache.get(player.voiceChannel);
                if (!voiceChannel) return;

                await axios.put(
                    `https://discord.com/api/v10/channels/${player.voiceChannel}/voice-status`,
                    { status: status },
                    { 
                        headers: { 
                            'Authorization': `Bot ${client.token}`,
                            'Content-Type': 'application/json'
                        } 
                    }
                );
            } catch (error) {
                console.error('Failed to update voice status:', error.response?.data || error.message);
            }
        };

        let bPause = createButton("pause", "1276835192295915623", ButtonStyle.Secondary);
        const bReplay = createButton("replay", "1276835198893559961", ButtonStyle.Secondary);
        const bSkip = createButton("skip", "1276835203146449031", ButtonStyle.Secondary);
        const bVDown = createButton("voldown", "1276835205377949737", ButtonStyle.Secondary);
        const bStop = createButton("stop", "⏹️", ButtonStyle.Danger);
        const bVUp = createButton("volup", "1276835207345078293", ButtonStyle.Secondary);
        let bAuto = createButton('autoplay', '1286677681882136576', player.isAutoplay ? ButtonStyle.Primary : ButtonStyle.Secondary);
        let bLoop = createButton("loop", "1276835185849143367", getLoopButtonStyle(player.loop));

        const getActionRows = (pauseBtn, loopBtn, autoBtn) => [
            new ActionRowBuilder().addComponents(pauseBtn, bReplay, bSkip, loopBtn),
            new ActionRowBuilder().addComponents(bStop, bVDown, bVUp, autoBtn)
        ];

        let startrow1 = getActionRows(bPause, bLoop, bAuto)[0];
        let startrow2 = getActionRows(bPause, bLoop, bAuto)[1];

        const channel = client.channels.cache.get(player.textChannel);
        const titles = track.info.title.length > 20 ? track.info.title.substr(0, 20) + "..." : track.info.title;
        const authors = track.info.author.length > 20 ? track.info.author.substr(0, 20) + "..." : track.info.author;
        const trackDuration = track.info.isStream ? "LIVE" : formatDuration(track.info.length);
        const trackAuthor = track.info.author ? authors : "Unknown";
        const trackTitle = track.info.title ? titles : "Unknown";
        const trackThumbnail = await (track.info.thumbnail || client.user.displayAvatarURL());

        const getEmbed = (loopMode = player.loop, volume = player.volume, iconURL = "https://media.tenor.com/dGZNbBlShRIAAAAM/swag-kid.gif") => 
            new EmbedBuilder()
                .setAuthor({ name: `Now Playing`, iconURL: iconURL })
                .setColor(clientOptions.embedColor)
                .setTitle(trackTitle)
                .setThumbnail(trackThumbnail)
                .setURL(track.info.uri)
                .addFields(
                    { name: "Artist", value: `${trackAuthor}`, inline: true },
                    { name: "Duration", value: `\`${trackDuration}\``, inline: true },
                    { name: "Requester", value: `${track.info.requester}`, inline: true },	
                )
                .setFooter({ text: `Loop: ${loopMode.charAt(0).toUpperCase() + loopMode.slice(1)} • Queue: ${player.queue.length} song(s) • Volume: ${volume}%` });

        if (!channel) throw new Error("Channel is undefined or null. Please ensure the channel exists.");

        let buttonState = await guild.findOne({ guildId: player.guildId });

        if (!buttonState) {
            buttonState = new guild({ guildId: player.guildId, buttons: true });
            await buttonState.save();
        }

        let msg;
        if (!buttonState.buttons) {
            msg = await channel.send({ embeds: [getEmbed()] });
        } else {
            msg = await channel.send({ embeds: [getEmbed()], components: getActionRows(bPause, bLoop, bAuto) });
        }
        player.message = msg;

      
        const currentTrack = player.queue.current || player._currentTrack || track;
        let statusText = '';
        if (player.paused) {
            statusText = `Paused ${currentTrack.info?.title || currentTrack.title}`;
        } else if (player.radio) {
            statusText = `Playing ${player.radioName} radio`;
        } else if (currentTrack?.info?.title || currentTrack?.title) {
            const title = currentTrack.info?.title || currentTrack.title;
            const author = currentTrack.info?.author || currentTrack.author;
            statusText = `Playing ${title}${author ? ` by ${author}` : ''}`;
        } else {
            statusText = 'Playing music';
        }
        
        await updateVoiceStatus(statusText);

        const filter = (message) => {
       
            const botVoiceChannel = message.guild.members.me.voice.channel;
            const userVoiceChannel = message.member.voice.channel;
            
            if (botVoiceChannel && botVoiceChannel.id === userVoiceChannel?.id) {
                return true;    
            } else {
                message.reply({
                    content: `\`❌\` | You must be in the same voice channel as me to use this button.`,
                    ephemeral: true,
                });
                return false;
            }
        };

        const collector = msg.createMessageComponentCollector({ filter, time: track.info.length * 15 });

        collector.on("collect", async (message) => {
            if (!player) {
                message.reply({ content: `\`❌\` | The player doesn't exist`, ephemeral: true });
                return collector.stop();
            }

            let replyEmbed = new EmbedBuilder().setColor(clientOptions.embedColor);
            let ephemeralReply = true;
            let shouldUpdateMsg = false;
            let newRows = getActionRows(bPause, bLoop, bAuto);

            switch (message.customId) {
                case "loop":
                    if (player.loop === "none") {
                        await player.setLoop("track");
                    } else if (player.loop === "track") {
                        await player.setLoop("queue");
                    } else if (player.loop === "queue") {
                        await player.setLoop("none");
                    }
                    bLoop = createButton("loop", "1276835185849143367", getLoopButtonStyle(player.loop));
                    replyEmbed.setDescription(`\`✔️\` | Loop mode set to : \`${player.loop}\``);
                    newRows = getActionRows(bPause, bLoop, bAuto);
                    shouldUpdateMsg = true;
                    break;

                case "replay":
                    await player.seek(0);
                    replyEmbed.setDescription('\`✔️\` | The song has been replayed');
                    ephemeralReply = false;
                    break;

                case "stop":
                    player.destroy();
                    if (player.message) await player.message.delete();
                    await updateVoiceStatus('Use /play to start playing music with me');
                    return;

                case "pause":
                    await player.pause(!player.paused);
                    bPause = createButton("pause", player.paused ? "1276835194636337152" : "1276835192295915623", player.paused ? ButtonStyle.Primary : ButtonStyle.Secondary);
                    newRows = getActionRows(bPause, bLoop, bAuto);
                    await message.deferUpdate();
                    await msg.edit({ components: newRows });
                    
                    const current = player.queue.current || player._currentTrack;
                    const currentTitle = current?.info?.title || current?.title || 'Unknown';
                    const currentAuthor = current?.info?.author || current?.author;
                    
                    await updateVoiceStatus(
                        player.paused 
                            ? `Paused ${currentTitle}` 
                            : `Playing ${currentTitle}${currentAuthor ? ` by ${currentAuthor}` : ''}`
                    );
                    return;

                case "skip":
                    if (player.queue.size == 0) {
                        replyEmbed.setDescription(`\`❌\` | Queue is: \`Empty\``);
                    } else {
                        await player.stop();
                        ephemeralReply = false; 
                    }
                    break;

                case "voldown":
                    if (player.volume <= 10) {
                        await player.setVolume(10);
                        replyEmbed.setDescription(`\`❌\` | Volume can't be lower than: \`10%\``);
                    } else {
                        await player.setVolume(player.volume - 10);
                        replyEmbed.setDescription(`\`✔️\` | Volume decreased to : \`${player.volume}%\``);
                        shouldUpdateMsg = true;
                    }
                    break;

                case "volup":
                    if (player.volume >= 150) {
                        await player.setVolume(150);
                        replyEmbed.setDescription(`\`❌\` | Volume can't be higher than: \`150%\``);
                    } else {
                        await player.setVolume(player.volume + 10);
                        replyEmbed.setDescription(`\`✔️\` | Volume increased to : \`${player.volume}%\``);
                        shouldUpdateMsg = true;
                    }
                    break;

                case "autoplay":
                    player.isAutoplay = !player.isAutoplay;
                    bAuto = createButton('autoplay', '1286677681882136576', player.isAutoplay ? ButtonStyle.Primary : ButtonStyle.Secondary);
                    replyEmbed.setDescription(`\`♾\` | Autoplay is now \`${player.isAutoplay ? "enabled" : "disabled"}\``);
                    newRows = getActionRows(bPause, bLoop, bAuto);
                    shouldUpdateMsg = true;
                    
                    await updateVoiceStatus(
                        player.isAutoplay 
                            ? 'Fetching related songs, please wait...' 
                            : 'Use /play to start playing music'
                    );
                    break;
            }

            await message.reply({ embeds: [replyEmbed], ephemeral: ephemeralReply });
            if (shouldUpdateMsg) {
                await msg.edit({ embeds: [getEmbed(player.loop, player.volume, trackThumbnail, "https://media1.tenor.com/m/9eqmLLJJwGcAAAAd/mood-dance.gif")], components: newRows });
            }
        });
    });
};