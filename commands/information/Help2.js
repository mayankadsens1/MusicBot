const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  ContainerBuilder,
  MediaGalleryBuilder,
  MessageFlags
} = require("discord.js");
const { logger } = require("../../utils/logger");
const config = require("../../config");
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require('canvas');

const ITEMS_PER_PAGE = 8;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

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

function clipCircle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x + r, y + r, r, 0, Math.PI * 2, false);
    ctx.clip();
}

class HelpCanvas {
    constructor() {
        this.canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
        this.ctx = this.canvas.getContext('2d');
    }

    async drawBackground() {
        const bgGradient = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        bgGradient.addColorStop(0, '#6a1b9a');
        bgGradient.addColorStop(1, '#4a148c');
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        roundRect(this.ctx, 40, 40, CANVAS_WIDTH - 80, CANVAS_HEIGHT - 80, 20);
        this.ctx.fillStyle = 'rgba(74, 20, 140, 0.85)';
        this.ctx.fill();
    }

    async drawHeader(client, text) {
        this.ctx.font = 'bold 32px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, CANVAS_WIDTH / 2, 100);

        try {
            const avatar = await loadImage(client.user.displayAvatarURL({ format: 'png', size: 128 }));
            this.ctx.save();
            clipCircle(this.ctx, 50, 20, 30);
            this.ctx.drawImage(avatar, 50, 20, 60, 60);
            this.ctx.restore();
        } catch (err) {
            logger(err, "error");
        }
    }

    drawCategories(categories) {
        let startY = 150;
        const boxPadding = 15;
        const boxHeight = 65;
        const boxWidth = 700;
        const centerX = (CANVAS_WIDTH - boxWidth) / 2;
        const footerPadding = 50;
        const totalHeight = (categories.length * (boxHeight + 10)) + startY;

        const spacingAdjustment = totalHeight > (CANVAS_HEIGHT - footerPadding) ? 
            ((CANVAS_HEIGHT - footerPadding) - totalHeight) / categories.length : 0;

        categories.forEach(category => {
            const commands = fs.readdirSync(path.join(__dirname, "../", category))
                .filter(file => file.endsWith(".js"));
            
            const gradient = this.ctx.createLinearGradient(centerX, startY - boxPadding, centerX, startY + boxHeight);
            gradient.addColorStop(0, 'rgba(106, 27, 154, 0.4)');
            gradient.addColorStop(1, 'rgba(74, 20, 140, 0.4)');
            
            this.ctx.save();
            roundRect(this.ctx, centerX, startY - boxPadding, boxWidth, boxHeight, 15);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            this.ctx.shadowColor = '#8e24aa';
            this.ctx.shadowBlur = 10;
            this.ctx.strokeStyle = '#8e24aa';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            this.ctx.shadowBlur = 0;
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(
                `${category.charAt(0).toUpperCase() + category.slice(1)}`,
                centerX + 25, startY + 15
            );

            this.ctx.font = '18px Arial';
            this.ctx.fillStyle = '#e0d7ff';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(
                `${commands.length} commands`, 
                centerX + boxWidth - 25, 
                startY + 15
            );
            
            this.ctx.restore();
            startY += boxHeight + 10 + spacingAdjustment;
        });
    }

    drawCommands(commands, startY = 150) {
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = '#ffffff';

        commands.forEach((cmd, index) => {
            if (index < ITEMS_PER_PAGE) {
                this.ctx.fillText(`/${cmd.data.name}`, 70, startY);
                this.ctx.font = '16px Arial';
                this.ctx.fillStyle = '#e0d7ff';
                this.ctx.fillText(`- ${cmd.data.description}`, 90, startY + 20);
                this.ctx.font = '20px Arial';
                this.ctx.fillStyle = '#ffffff';
                startY += 50;
            }
        });
    }

    drawFooter(text) {
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#e0d7ff';
        this.ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);
    }

    drawPageIndicator(currentPage, totalPages) {
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(`Page ${currentPage}/${totalPages}`, CANVAS_WIDTH - 70, CANVAS_HEIGHT - 30);
    }

    getBuffer() {
        return this.canvas.toBuffer();
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help2")
        .setDescription("Display information about all available commands")
        .setDMPermission(true)
        .addStringOption(option =>
            option.setName("category")
                .setDescription("Filter commands by category")
                .setRequired(false)
                .addChoices(
                    { name: 'Music', value: 'music' },
                    { name: 'Filter', value: 'filter' },
                    { name: 'Playlist', value: 'playlist' },
                    { name: 'Information', value: 'information' },
                    { name: 'Setting', value: 'setting' },
                    { name: 'Developer', value: 'developer' }
                )
        ),

    run: async ({ interaction, client }) => {
        try {
            await interaction.deferReply();
            
            const selectedCategory = interaction.options.getString("category");
            const canvas = new HelpCanvas();
            const categories = fs.readdirSync(path.join(__dirname, "../"))
                .filter(dir => !dir.includes("."));

            if (selectedCategory) {
                if (!categories.includes(selectedCategory)) {
                    return interaction.editReply({ 
                        content: `Invalid category "${selectedCategory}"`, 
                    });
                }

                const commands = loadCommandsForCategory(selectedCategory);
                const pages = createPages(commands);
                const buffer = await renderCanvasCategory(canvas, client, selectedCategory, pages[0], 1, pages.length);
                const attachment = new AttachmentBuilder(buffer, { name: 'help.png' });

                const container = createContainer(categories, 1, pages.length);

                await interaction.editReply({
                    files: [attachment],
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            } else {
                const buffer = await renderCanvasMainMenu(canvas, client, categories);
                const attachment = new AttachmentBuilder(buffer, { name: "help.png" });
                const container = createContainer(categories, 1, 1);

                await interaction.editReply({
                    files: [attachment],
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const message = await interaction.fetchReply();
            setupCollectors(message, interaction, client, canvas, categories);

        } catch (err) {
            logger(err, "error");
            if (interaction.deferred) {
                return interaction.editReply({
                    content: `An error occurred: ${err.message}`
                });
            } else {
                return interaction.reply({
                    content: `An error occurred: ${err.message}`,
                    ephemeral: true
                });
            }
        }
    }
};

async function renderCanvasMainMenu(canvas, client, categories) {
    await canvas.drawBackground();
    await canvas.drawHeader(client, `${client.user.username} Help Menu`);
    canvas.drawCategories(categories);
    canvas.drawFooter("Made with ❤️ by CodeX Development");
    return canvas.getBuffer();
}

async function renderCanvasCategory(canvas, client, category, commands, currentPage, totalPages) {
    await canvas.drawBackground();
    await canvas.drawHeader(client, `${category.charAt(0).toUpperCase() + category.slice(1)} Commands`);
    canvas.drawCommands(commands);
    canvas.drawPageIndicator(currentPage, totalPages);
    canvas.drawFooter(`${commands.length} commands in this category`);
    return canvas.getBuffer();
}

function createContainer(categories, currentPage, totalPages) {
    const gallery = new MediaGalleryBuilder().addItems(item =>
        item.setURL("attachment://help.png").setDescription("Help Menu")
    );

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("help_cat")
        .setPlaceholder("Select a category")
        .addOptions([
            { label: "Home", description: "Return to main menu", value: "home" },
            ...categories.map(c => ({
                label: c.charAt(0).toUpperCase() + c.slice(1),
                description: `View ${c} commands`,
                value: c
            }))
        ]);

    const prevButton = new ButtonBuilder()
        .setCustomId("prev")
        .setEmoji("⬅️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 1);

    const nextButton = new ButtonBuilder()
        .setCustomId("next")
        .setEmoji("➡️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === totalPages || totalPages === 1);

    return new ContainerBuilder()
        .addMediaGalleryComponents(_ => gallery)
        .addActionRowComponents(row => row.setComponents(selectMenu))
        .addActionRowComponents(row => row.setComponents(prevButton, nextButton));
}

function createPages(commands) {
    const pages = [];
    for (let i = 0; i < commands.length; i += ITEMS_PER_PAGE) {
        pages.push(commands.slice(i, i + ITEMS_PER_PAGE));
    }
    return pages.length > 0 ? pages : [[]];
}

function loadCommandsForCategory(category) {
    try {
        return fs.readdirSync(path.join(__dirname, "../", category))
            .filter(file => file.endsWith(".js"))
            .map(file => require(`../${category}/${file}`));
    } catch (err) {
        logger(err, "error");
        return [];
    }
}

function setupCollectors(message, interaction, client, canvas, categories) {
    let currentPage = 1;
    let currentCategory = null;
    let totalPages = 1;
    let commands = [];

    const collector = message.createMessageComponentCollector({
        time: 300000
    });

    collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
            return i.reply({
                content: "You can't use these buttons!",
                ephemeral: true
            });
        }

        try {
            await i.deferUpdate();

            if (i.customId === 'prev' && currentPage > 1) {
                currentPage--;
            } else if (i.customId === 'next' && currentPage < totalPages) {
                currentPage++;
            } else if (i.customId === 'help_cat') {
                currentCategory = i.values[0] === 'home' ? null : i.values[0];
                currentPage = 1;
            }

            let buffer;
            if (currentCategory) {
                commands = loadCommandsForCategory(currentCategory);
                const pages = createPages(commands);
                totalPages = pages.length;
                const pageCommands = pages[currentPage - 1] || [];
                buffer = await renderCanvasCategory(canvas, client, currentCategory, pageCommands, currentPage, totalPages);
            } else {
                currentCategory = null;
                totalPages = 1;
                buffer = await renderCanvasMainMenu(canvas, client, categories);
            }

            const attachment = new AttachmentBuilder(buffer, { name: 'help.png' });
            const container = createContainer(categories, currentPage, totalPages);

            await i.editReply({
                files: [attachment],
                components: [container]
            });

        } catch (error) {
            logger(error, "error");
            await i.followUp({
                content: "An error occurred while updating the help menu.",
                ephemeral: true
            }).catch(() => {});
        }
    });

    collector.on('end', () => {
        if (!message.deleted) {
            message.edit({ components: [] }).catch(() => {});
        }
    });
}