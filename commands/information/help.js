const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
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

// Add this helper function for circular clipping
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
        // Create gradient background
        const bgGradient = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        bgGradient.addColorStop(0, '#6a1b9a');
        bgGradient.addColorStop(1, '#4a148c');
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Add rounded semi-transparent overlay
        roundRect(this.ctx, 40, 40, CANVAS_WIDTH - 80, CANVAS_HEIGHT - 80, 20);
        this.ctx.fillStyle = 'rgba(74, 20, 140, 0.85)';
        this.ctx.fill();
    }

    async drawHeader(client, text) {
        this.ctx.font = 'bold 32px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, CANVAS_WIDTH / 2, 50);

        try {
            const avatar = await loadImage(client.user.displayAvatarURL({ format: 'png', size: 128 }));
            // Save context state
            this.ctx.save();
            // Create circular clipping path
            clipCircle(this.ctx, 50, 20, 30);
            // Draw avatar
            this.ctx.drawImage(avatar, 50, 20, 60, 60);
            // Restore context state
            this.ctx.restore();
        } catch (err) {
            logger(err, "error");
        }
    }

    drawCategories(categories, icons) {
        let startY = 120;  // Start a bit higher
        const boxPadding = 15;
        const boxHeight = 65;  // Slightly reduce box height
        const boxWidth = 700;
        const centerX = (CANVAS_WIDTH - boxWidth) / 2;
        const footerPadding = 50;  // Add padding for footer
        const totalHeight = (categories.length * (boxHeight + 10)) + startY;

        // Adjust spacing if content would overlap with footer
        const spacingAdjustment = totalHeight > (CANVAS_HEIGHT - footerPadding) ? 
            ((CANVAS_HEIGHT - footerPadding) - totalHeight) / categories.length : 0;

        categories.forEach(category => {
            const commands = fs.readdirSync(path.join(__dirname, "../", category))
                .filter(file => file.endsWith(".js"));
            
            // Draw box background with gradient
            const gradient = this.ctx.createLinearGradient(centerX, startY - boxPadding, centerX, startY + boxHeight);
            gradient.addColorStop(0, 'rgba(106, 27, 154, 0.4)');
            gradient.addColorStop(1, 'rgba(74, 20, 140, 0.4)');
            
            this.ctx.save();
            roundRect(this.ctx, centerX, startY - boxPadding, boxWidth, boxHeight, 15);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            // Draw border with glow effect
            this.ctx.shadowColor = '#8e24aa';
            this.ctx.shadowBlur = 10;
            this.ctx.strokeStyle = '#8e24aa';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Draw category name
            this.ctx.shadowBlur = 0;
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(
                `${category.charAt(0).toUpperCase() + category.slice(1)}`,
                centerX + 25, startY + 15
            );

            // Draw command count
            this.ctx.font = '18px Arial';
            this.ctx.fillStyle = '#e0d7ff';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(
                `${commands.length} commands`, 
                centerX + boxWidth - 25, 
                startY + 15
            );
            
            this.ctx.restore();
            startY += boxHeight + 10 + spacingAdjustment; // Add dynamic spacing adjustment
        });
    }

    drawCommands(commands, startY = 120) {
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = '#ffffff'; // Primary text in white

        commands.forEach((cmd, index) => {
            if (index < ITEMS_PER_PAGE) {
                this.ctx.fillText(`/${cmd.data.name}`, 50, startY);
                this.ctx.font = '16px Arial';
                this.ctx.fillStyle = '#e0d7ff'; // Description in light purple
                this.ctx.fillText(`- ${cmd.data.description}`, 70, startY + 20);
                this.ctx.font = '20px Arial';
                this.ctx.fillStyle = '#ffffff'; // Reset to white
                startY += 50;
            }
        });
    }

    drawFooter(text) {
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#e0d7ff'; // Light purple for footer
        this.ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);
    }

    drawPageIndicator(currentPage, totalPages) {
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(`Page ${currentPage}/${totalPages}`, CANVAS_WIDTH - 50, CANVAS_HEIGHT - 30);
    }

    getBuffer() {
        return this.canvas.toBuffer();
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
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
            // Defer the reply immediately to prevent timeout
            await interaction.deferReply();
            
            const selectedCategory = interaction.options.getString("category");
            const canvas = new HelpCanvas();
            
            const categories = fs.readdirSync(path.join(__dirname, "../"))
                .filter(dir => !dir.includes("."));

            const categoryIcons = {
                'music': '',
                'filter': '',
                'playlist': '',
                'information': '',
                'setting': '',
                'developer': ''
            };

            await canvas.drawBackground();

            if (selectedCategory) {
                // Handle specific category
                if (!categories.includes(selectedCategory)) {
                    return interaction.editReply({ 
                        content: `Invalid category "${selectedCategory}"`, 
                    });
                }

                const commands = fs.readdirSync(path.join(__dirname, "../", selectedCategory))
                    .filter(file => file.endsWith(".js"))
                    .map(file => require(`../${selectedCategory}/${file}`));

                const totalPages = Math.ceil(commands.length / ITEMS_PER_PAGE);
                const pageCommands = commands.slice(0, ITEMS_PER_PAGE);

                await canvas.drawHeader(client, `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Commands`);
                canvas.drawCommands(pageCommands);
                canvas.drawPageIndicator(1, totalPages);
                canvas.drawFooter(`${commands.length} commands in this category`);

                const attachment = new AttachmentBuilder(canvas.getBuffer(), { name: 'help.png' });
                await interaction.editReply({
                    files: [attachment],
                    components: createComponents(categories, categoryIcons, 1, totalPages)
                });
            } else {
                // Show main help menu
                await canvas.drawHeader(client, `${client.user.username} Help Menu`);
                canvas.drawCategories(categories, categoryIcons);
                canvas.drawFooter('Made with ❤️ by CodeX Development');

                const attachment = new AttachmentBuilder(canvas.getBuffer(), { name: 'help.png' });
                await interaction.editReply({
                    files: [attachment],
                    components: createComponents(categories, categoryIcons)
                });
            }

            // Set up collector after sending the initial response
            const message = await interaction.fetchReply();
            setupCollectors(message, interaction, client, categories, categoryIcons);

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

function createComponents(categories, categoryIcons, currentPage = 1, totalPages = 1) {
    const rows = [];

    // Category select menu
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('Select a category')
        .addOptions([
            {
                label: 'Home',
                description: 'Return to main menu',
                value: 'home'
            },
            ...categories.map(category => ({
                label: category.charAt(0).toUpperCase() + category.slice(1),
                description: `View ${category} commands`,
                value: category
            }))
        ]);

    rows.push(new ActionRowBuilder().addComponents(selectMenu));

    // Add pagination buttons if needed
    if (totalPages > 1) {
        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev_page')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 1),
            new ButtonBuilder()
                .setCustomId('next_page')
                .setEmoji('➡️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === totalPages)
        );
        rows.push(buttonRow);
    }

    return rows;
}

function setupCollectors(message, interaction, client, categories, categoryIcons) {
    let currentPage = 1;
    let currentCategory = null;
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
            // Defer the button interaction update
            await i.deferUpdate();

            const canvas = new HelpCanvas();
            await canvas.drawBackground();

            if (i.customId === 'prev_page' && currentPage > 1) {
                currentPage--;
            } else if (i.customId === 'next_page') {
                currentPage++;
            } else if (i.customId === 'help_category_select') {
                currentCategory = i.values[0];
                currentPage = 1;
            }

            if (currentCategory && currentCategory !== 'home') {
                commands = fs.readdirSync(path.join(__dirname, "../", currentCategory))
                    .filter(file => file.endsWith(".js"))
                    .map(file => require(`../${currentCategory}/${file}`));

                const totalPages = Math.ceil(commands.length / ITEMS_PER_PAGE);
                const pageCommands = commands.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

                await canvas.drawHeader(client, `${currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)} Commands`);
                canvas.drawCommands(pageCommands);
                canvas.drawPageIndicator(currentPage, totalPages);
                canvas.drawFooter(`${commands.length} commands in this category`);

                const attachment = new AttachmentBuilder(canvas.getBuffer(), { name: 'help.png' });
                await i.editReply({
                    files: [attachment],
                    components: createComponents(categories, categoryIcons, currentPage, totalPages)
                });
            } else {
                currentCategory = null;
                await canvas.drawHeader(client, `${client.user.username} Help Menu`);
                canvas.drawCategories(categories, categoryIcons);
                canvas.drawFooter('Made with ❤️ by CodeX Development');

                const attachment = new AttachmentBuilder(canvas.getBuffer(), { name: 'help.png' });
                await i.editReply({
                    files: [attachment],
                    components: createComponents(categories, categoryIcons)
                });
            }
        } catch (error) {
            logger(error, "error");
            await i.followUp({
                content: "An error occurred while updating the help menu.",
                ephemeral: true
            });
        }
    });

    collector.on('end', () => {
        if (!message.deleted) {
            message.edit({ components: [] }).catch(console.error);
        }
    });
}