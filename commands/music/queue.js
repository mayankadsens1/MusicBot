const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    AttachmentBuilder
} = require("discord.js");
const { parseTimeString } = require("../../utils/parseTimeString");
const { logger } = require("../../utils/logger");
const config = require("../../config");
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { msToTime } = require("../../utils/msToTime");

// Helper function for drawing rounded rectangles
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

module.exports = {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("View the queue and currently playing song")
        .setDMPermission(false),

    run: async ({ interaction, client }) => {
        try {
            await interaction.deferReply();
            await interaction.editReply({ content: "`🔎` | Loading queue..." });

            const player = client.riffy.players.get(interaction.guildId);

            if (!player || !player.queue || !player.queue.length) {
                return interaction.editReply({ 
                    content: "`❌` | No songs are currently playing.",  
                    ephemeral: true 
                });
            }

            const songsPerPage = 10;
            const totalPages = Math.ceil(player.queue.length / songsPerPage);
            let currentPage = 0;

            const generateSongList = async (page) => {
                const start = page * songsPerPage;
                const end = Math.min(start + songsPerPage, player.queue.length);
                const songsToDraw = player.queue.slice(start, end);

                // Prepare all thumbnails first
                const songsWithThumbnails = await Promise.all(
                    songsToDraw.map(async (track) => {
                        let thumbnailImage = null;
                        try {
                            if (track.info.thumbnail) {
                                const thumbnail = await track.info.thumbnail;
                                if (thumbnail) {
                                    thumbnailImage = await loadImage(thumbnail);
                                }
                            }
                        } catch (err) {
                            logger("Failed to load thumbnail", "warn");
                        }
                        return {
                            ...track,
                            thumbnailImage
                        };
                    })
                );

                // Create canvas with adjusted dimensions for thumbnails
                const cardWidth = 760;
                const cardHeight = 80;
                const thumbnailSize = 60; // Size of the thumbnail
                const cardPadding = 10;
                const canvas = createCanvas(800, songsToDraw.length * (cardHeight + cardPadding) + cardPadding);
                const ctx = canvas.getContext('2d');

                // Background gradient
                const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                bgGradient.addColorStop(0, '#6a1b9a');
                bgGradient.addColorStop(1, '#4a148c');
                ctx.fillStyle = bgGradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                let y = cardPadding;

                for (let i = 0; i < songsWithThumbnails.length; i++) {
                    const track = songsWithThumbnails[i];
                    const songIndex = start + i + 1;

                    // Draw card background
                    const cardX = cardPadding;
                    const cardY = y;
                    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 16);
                    ctx.fillStyle = 'rgba(74, 20, 140, 0.85)';
                    ctx.fill();

                    // Draw song number
                    ctx.font = 'bold 28px Arial';
                    ctx.fillStyle = '#fff';
                    ctx.textAlign = 'center';
                    ctx.fillText(`${songIndex}.`, cardX + 30, cardY + cardHeight / 2 + 10);

                    // Draw thumbnail if available
                    if (track.thumbnailImage) {
                        ctx.save();
                        roundRect(ctx, cardX + 60, cardY + 10, thumbnailSize, thumbnailSize, 8);
                        ctx.clip();
                        ctx.drawImage(track.thumbnailImage, cardX + 60, cardY + 10, thumbnailSize, thumbnailSize);
                        ctx.restore();
                    }

                    // Draw title (adjusted position to accommodate thumbnail)
                    ctx.font = 'bold 22px Arial';
                    ctx.fillStyle = '#fff';
                    ctx.textAlign = 'left';
                    ctx.fillText(
                        track.info.title.length > 35 ? track.info.title.slice(0, 32) + '...' : track.info.title,
                        cardX + 130, cardY + cardHeight / 2 - 5
                    );

                    // Draw author
                    ctx.font = '18px Arial';
                    ctx.fillStyle = '#e0d7ff';
                    ctx.fillText(
                        `by ${track.info.author}`,
                        cardX + 130, cardY + cardHeight / 2 + 20
                    );

                    // Add duration on the right
                    ctx.textAlign = 'right';
                    ctx.fillStyle = '#e0d7ff';
                    ctx.fillText(
                        msToTime(track.info.length),
                        cardX + cardWidth - 20, cardY + cardHeight / 2 + 10
                    );
                    ctx.textAlign = 'left'; // Reset text alignment for next iteration

                    y += cardHeight + cardPadding;
                }

                return canvas.toBuffer('image/png');
            };

            const generateQueueImage = async () => { 
                const songListBuffer = await generateSongList(currentPage);
                return new AttachmentBuilder(songListBuffer, { name: 'queue.png' });
            };

            let row;
            if (totalPages > 1) {
                row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev_page')
                            .setLabel('🠈')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === 0),
                        new ButtonBuilder()
                            .setCustomId('next_page')
                            .setLabel('🠊')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === totalPages - 1)
                    );
            }

            const reply = await interaction.editReply({
                content: `**Current Queue** (Page ${currentPage + 1} of ${totalPages})`,
                components: row ? [row] : [],
                files: [await generateQueueImage()], // Send the canvas image as a file
                fetchReply: true
            });

            const filter = async (buttonInteraction) => {
                if (buttonInteraction.user.id !== interaction.user.id) {
                    await buttonInteraction.reply({ content: "`❌` | You cannot use these controls as you did not initiate the command. Use /queue to view the queue.", ephemeral: true });
                    return false;
                }
                return true;
            };

            if (row) {
                const collector = reply.createMessageComponentCollector({ filter, time: parseTimeString("60s") });

                collector.on('collect', async (buttonInteraction) => {
                    if (buttonInteraction.customId === 'next_page') {
                        currentPage++;
                    } else if (buttonInteraction.customId === 'prev_page') {
                        currentPage--;
                    }

                    const attachment = await generateQueueImage();
                    row.components[0].setDisabled(currentPage === 0);
                    row.components[1].setDisabled(currentPage === totalPages - 1);

                    await buttonInteraction.update({ 
                        content: `**Current Queue** (Page ${currentPage + 1} of ${totalPages})`, 
                        components: [row], 
                        files: [attachment] 
                    });
                });

                collector.on('end', () => {
                    row.components.forEach(button => button.setDisabled(true));
                    interaction.editReply({ components: [row] });
                });
            }

        } catch (err) {
            logger(err, "error");
            return interaction.editReply({ 
                content: `\`❌\` | An error occurred: ${err.message}`, 
                ephemeral: true 
            });
        }
    },
    options: {
        inVoice: true,
        sameVoice: true,
    }
};