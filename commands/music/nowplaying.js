const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { logger } = require("../../utils/logger");
const config = require("../../config");
const { progressBar } = require("../../utils/progressbar");
const { msToTime } = require("../../utils/msToTime");
const { createCanvas, loadImage } = require('@napi-rs/canvas');

// Helper function for rounded rectangles
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
        .setName("nowplaying")
        .setDescription("Shows information about the currently playing song")
        .setDMPermission(false),

    run: async ({ client, interaction }) => {
        try {
            await interaction.deferReply();
            const player = client.riffy.players.get(interaction.guildId);

            if (!player || !player.playing) {
                return interaction.editReply({
                    content: "`❌` | There's nothing playing in this server.",
                    ephemeral: true
                });
            }

            const track = player.current;
            
            if (!track || !track.info) {
                return interaction.editReply({
                    content: "`❌` | No track found in queue.",
                    ephemeral: true
                });
            }

            const position = player.position;
            const duration = track.info.length;
            const progress = (position / duration) * 100;

            // Create canvas
            const canvas = createCanvas(800, 250);
            const ctx = canvas.getContext('2d');

            // Background gradient
            const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            bgGradient.addColorStop(0, '#6a1b9a');
            bgGradient.addColorStop(1, '#4a148c');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw main container with rounded corners
            roundRect(ctx, 20, 20, canvas.width - 40, canvas.height - 40, 20);
            ctx.fillStyle = 'rgba(74, 20, 140, 0.85)';
            ctx.fill();

            // Load and draw thumbnail if available
            try {
                if (track.info.thumbnail) {
                    const thumbnail = await loadImage(track.info.thumbnail);
                    ctx.save();
                    roundRect(ctx, 40, 40, 160, 160, 10);
                    ctx.clip();
                    ctx.drawImage(thumbnail, 40, 40, 160, 160);
                    ctx.restore();
                }
            } catch (err) {
                logger("Failed to load thumbnail", "warn");
            }

            // Draw title
            ctx.font = 'bold 24px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(
                track.info.title.length > 40 ? track.info.title.slice(0, 37) + '...' : track.info.title,
                220, 70
            );

            // Draw artist
            ctx.font = '20px Arial';
            ctx.fillStyle = '#e0d7ff';
            ctx.fillText(`by ${track.info.author}`, 220, 100);

            // Draw requester
            ctx.fillText(
                `Requested by: ${track.info.requester?.username || track.info.requester?.displayName || "Unknown"}`,
                220, 130
            );

            // Draw progress bar background
            ctx.fillStyle = '#382B5F';
            roundRect(ctx, 220, 160, 540, 20, 10);
            ctx.fill();

            // Draw progress bar
            const progressWidth = (progress / 100) * 540;
            ctx.fillStyle = '#fff';
            roundRect(ctx, 220, 160, progressWidth, 20, 10);
            ctx.fill();

            // Draw time
            ctx.font = '18px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(msToTime(position), 220, 200);
            ctx.textAlign = 'right';
            ctx.fillText(msToTime(duration), 760, 200);

            // Convert canvas to attachment
            const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'nowplaying.png' });

            return interaction.editReply({
                files: [attachment]
            });

        } catch (err) {
            logger(err, "error");
            return interaction.editReply({
                content: `\`❌\` | An error occurred: ${err.message}`,
                ephemeral: true
            });
        }
    }
};