const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder,
    EmbedBuilder
} = require("discord.js");
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { find } = require('llyrics');
const { parseTimeString } = require("../../utils/parseTimeString");
const { logger } = require("../../utils/logger");
const config = require("../../config");

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 700;

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

class LyricsCanvas {
    constructor() {
        this.canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
        this.ctx = this.canvas.getContext('2d');
        this.particles = Array.from({length: 80}, () => ({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: Math.random() * 4 + 1,
            speed: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.8 + 0.2,
            color: this.getRandomColor(),
            angle: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.02
        }));
        this.time = 0;
    }

    getRandomColor() {
        const colors = ['#9f72ea', '#72eaa9', '#ea9f72', '#72a9ea', '#ea72d4', '#eae872'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    updateParticles() {
        this.time += 0.016;
        this.particles.forEach(particle => {
            particle.y -= particle.speed;
            particle.x += Math.sin(this.time + particle.angle) * 0.5;
            particle.angle += particle.rotSpeed;
            particle.opacity = (Math.sin(this.time * particle.speed * 0.5) + 1) / 2 * 0.6 + 0.3;
            
            if (particle.y < -10) {
                particle.y = CANVAS_HEIGHT + 10;
                particle.x = Math.random() * CANVAS_WIDTH;
            }
            if (particle.x < -10 || particle.x > CANVAS_WIDTH + 10) {
                particle.x = Math.random() * CANVAS_WIDTH;
            }
        });
    }

    async drawBackground() {
        const gradient = this.ctx.createRadialGradient(
            CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 0,
            CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH / 2
        );
        gradient.addColorStop(0, '#1a0d2e');
        gradient.addColorStop(0.4, '#16213e');
        gradient.addColorStop(0.8, '#0f3460');
        gradient.addColorStop(1, '#0a1f3d');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        this.updateParticles();
        this.particles.forEach(particle => {
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `${particle.color}${Math.floor(particle.opacity * 255).toString(16).padStart(2, '0')}`;
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
            this.ctx.fillStyle = `${particle.color}${Math.floor(particle.opacity * 0.3 * 255).toString(16).padStart(2, '0')}`;
            this.ctx.fill();
        });
    }

    async drawLyrics(songInfo, text, currentPage, totalPages, thumbnail = null) {
        this.ctx.save();
        
        roundRect(this.ctx, 20, 20, CANVAS_WIDTH - 40, CANVAS_HEIGHT - 40, 25);
        this.ctx.fillStyle = 'rgba(26, 13, 46, 0.85)';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(159, 114, 234, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        if (thumbnail) {
            try {
                this.ctx.save();
                roundRect(this.ctx, 40, 40, 120, 120, 15);
                this.ctx.clip();
                this.ctx.drawImage(thumbnail, 40, 40, 120, 120);
                this.ctx.restore();
            } catch (err) {
                logger("Failed to draw thumbnail", "warn");
            }
        }

        this.ctx.shadowBlur = 25;
        this.ctx.shadowColor = '#9f72ea';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
       

        const titleX = thumbnail ? 180 : CANVAS_WIDTH / 2;
        const titleAlign = thumbnail ? 'left' : 'center';
        
        this.ctx.shadowBlur = 15;
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillStyle = '#72eaa9';
        this.ctx.textAlign = titleAlign;
        
        const maxTitleWidth = thumbnail ? CANVAS_WIDTH - 220 : CANVAS_WIDTH - 80;
        const title = songInfo.title.length > 40 ? songInfo.title.slice(0, 37) + '...' : songInfo.title;
        this.ctx.fillText(title, titleX, thumbnail ? 90 : 110);
        
        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = '#ea9f72';
        const artist = songInfo.artist.length > 35 ? songInfo.artist.slice(0, 32) + '...' : songInfo.artist;
        this.ctx.fillText(`by ${artist}`, titleX, thumbnail ? 115 : 135);

        this.ctx.shadowBlur = 10;
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'left';
        const lines = text.split('\n');
        let y = thumbnail ? 200 : 170;

        lines.forEach(line => {
            if (y < CANVAS_HEIGHT - 70 && line.trim()) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.shadowColor = '#9f72ea';
                this.ctx.shadowBlur = 8;
                
                const maxWidth = CANVAS_WIDTH - 80;
                const words = line.split(' ');
                let currentLine = '';
                
                words.forEach(word => {
                    const testLine = currentLine + word + ' ';
                    const metrics = this.ctx.measureText(testLine);
                    
                    if (metrics.width > maxWidth && currentLine !== '') {
                        if (currentLine.trim()) {
                            this.ctx.fillText(`♫ ${currentLine.trim()}`, 40, y);
                            y += 28;
                        }
                        currentLine = word + ' ';
                    } else {
                        currentLine = testLine;
                    }
                });
                
                if (currentLine.trim() && y < CANVAS_HEIGHT - 80) {
                    this.ctx.fillText(`♫ ${currentLine.trim()}`, 40, y);
                    y += 28;
                }
            }
        });

        this.ctx.shadowBlur = 12;
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = '#72a9ea';
        this.ctx.fillText(`Source: ${songInfo.engine.toUpperCase()}`, CANVAS_WIDTH - 40, CANVAS_HEIGHT - 50);

        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#9f72ea';
        this.ctx.fillText(`Page ${currentPage + 1} of ${totalPages}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);

        this.ctx.restore();
    }

    getBuffer() {
        return this.canvas.toBuffer('image/png');
    }
}

async function searchLyrics(songTitle, artistName = '') {
    const searchEngines = ['musixmatch', 'youtube', 'genius'];
    
    for (const engine of searchEngines) {
        try {
            logger(`Searching lyrics with ${engine}...`, "info");
            
            const searchOptions = {
                song: songTitle,
                engine: engine,
                forceSearch: false
            };

            if (artistName && artistName.trim()) {
                searchOptions.artist = artistName;
            }

            if (engine === 'genius' && config.geniusApiKey) {
                searchOptions.geniusApiKey = config.geniusApiKey;
            }

            const result = await find(searchOptions);
            
            if (result && result.lyrics && result.lyrics.trim()) {
                logger(`Found lyrics using ${engine}`, "info");
                return result;
            }
        } catch (error) {
            logger(`Failed to fetch lyrics from ${engine}: ${error.message}`, "warn");
            continue;
        }
    }
    
    return null;
}

function chunkLyrics(lyrics, maxLinesPerPage = 22) {
    const lines = lyrics.split('\n').filter(line => line.trim());
    const chunks = [];
    
    for (let i = 0; i < lines.length; i += maxLinesPerPage) {
        chunks.push(lines.slice(i, i + maxLinesPerPage).join('\n'));
    }
    
    return chunks.length > 0 ? chunks : [lyrics];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("lyrics")
        .setDescription("Display lyrics for the currently playing song or search for specific lyrics")
        .addStringOption(option =>
            option.setName('song')
                .setDescription('Song title to search for (optional - uses current song if not provided)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('artist')
                .setDescription('Artist name for more accurate results (optional)')
                .setRequired(false))
        .setDMPermission(false),

    run: async ({ interaction, client }) => {
        try {
            await interaction.deferReply();

            let songTitle, artistName, thumbnail = null;
            const inputSong = interaction.options.getString('song');
            const inputArtist = interaction.options.getString('artist');

            if (inputSong) {
                songTitle = inputSong;
                artistName = inputArtist || '';
            } else {
                const player = client.riffy.players.get(interaction.guildId);
                if (!player || !player.current || !player.current.info) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setColor('#ff6b6b')
                            .setTitle('❌ No Song Found')
                            .setDescription('No song is currently playing and no song was specified. Use `/lyrics song:<title>` to search for specific lyrics.')
                        ]
                    });
                }
                
                const track = player.current;
                songTitle = track.info.title;
                artistName = track.info.author || '';
                
                if (track.info.thumbnail) {
                    try {
                        thumbnail = await loadImage(track.info.thumbnail);
                    } catch (err) {
                        logger("Failed to load track thumbnail", "warn");
                    }
                }
            }

            const searchingEmbed = new EmbedBuilder()
                .setColor('#ffd93d')
                .setTitle('🔍 Searching for Lyrics...')
                .setDescription(`**Song:** ${songTitle}\n**Artist:** ${artistName || 'Unknown'}\n\nSearching through Musixmatch → YouTube → Genius...`)
                .setTimestamp();

           // await interaction.editReply({ embeds: [searchingEmbed] });

            const lyricsData = await searchLyrics(songTitle, artistName);

            if (!lyricsData || !lyricsData.lyrics) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ff6b6b')
                        .setTitle('❌ No Lyrics Found')
                        .setDescription(`Sorry, I couldn't find lyrics for **${songTitle}**${artistName ? ` by **${artistName}**` : ''}.\n\nTried searching on:\n• Musixmatch\n• YouTube\n• Genius`)
                        .setTimestamp()
                    ]
                });
            }

            const lyricsChunks = chunkLyrics(lyricsData.lyrics, 20);
            let currentPage = 0;
            const canvas = new LyricsCanvas();

            const updateLyrics = async () => {
                await canvas.drawBackground();
                await canvas.drawLyrics(lyricsData, lyricsChunks[currentPage], currentPage, lyricsChunks.length, thumbnail);
                return new AttachmentBuilder(canvas.getBuffer(), { name: 'lyrics.png' });
            };

            const createNavigationRow = () => {
                return new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('first')
                            .setLabel('⏪')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === 0),
                        new ButtonBuilder()
                            .setCustomId('prev')
                            .setLabel('◀️ Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === 0),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('Next ▶️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === lyricsChunks.length - 1),
                        new ButtonBuilder()
                            .setCustomId('last')
                            .setLabel('⏩')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === lyricsChunks.length - 1)
                    );
            };

            const infoEmbed = new EmbedBuilder()
                .setColor('#6bcf7f')
                .setTitle('🎵 Lyrics Found!')
                .setDescription(`**${lyricsData.title}** by **${lyricsData.artist}**`)
                .addFields(
                    { name: '📄 Pages', value: `${lyricsChunks.length}`, inline: true },
                    { name: '🔍 Source', value: lyricsData.engine.toUpperCase(), inline: true },
                    { name: '⏱️ Expires', value: '<t:' + Math.floor((Date.now() + 300000) / 1000) + ':R>', inline: true }
                )
                .setTimestamp();

            if (lyricsData.artworkURL) {
                infoEmbed.setThumbnail(lyricsData.artworkURL);
            }

            const attachment = await updateLyrics();
            const row = createNavigationRow();

            const reply = await interaction.editReply({
                files: [attachment],
                components: lyricsChunks.length > 1 ? [row] : []
            });

            if (lyricsChunks.length > 1) {
                const filter = (buttonInteraction) => {
                    return buttonInteraction.user.id === interaction.user.id;
                };

                const collector = reply.createMessageComponentCollector({ 
                    filter, 
                    time: parseTimeString("300s") 
                });

                collector.on('collect', async (buttonInteraction) => {
                    switch (buttonInteraction.customId) {
                        case 'first':
                            currentPage = 0;
                            break;
                        case 'prev':
                            currentPage = Math.max(0, currentPage - 1);
                            break;
                        case 'next':
                            currentPage = Math.min(lyricsChunks.length - 1, currentPage + 1);
                            break;
                        case 'last':
                            currentPage = lyricsChunks.length - 1;
                            break;
                    }

                    const newRow = createNavigationRow();
                    const newAttachment = await updateLyrics();
                    
                    await buttonInteraction.update({ 
                        files: [newAttachment], 
                        components: [newRow] 
                    });
                });

                collector.on('end', () => {
                    const disabledRow = createNavigationRow();
                    disabledRow.components.forEach(button => button.setDisabled(true));
                    interaction.editReply({ components: [disabledRow] }).catch(() => {});
                });
            }

        } catch (err) {
            logger(err, "error");
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Error Occurred')
                    .setDescription(`An error occurred while fetching lyrics: ${err.message}`)
                    .setTimestamp()
                ]
            });
        }
    },
    
    options: {
        inVoice: true,
        sameVoice: true,
    }
};