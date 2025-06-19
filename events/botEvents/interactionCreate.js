// Add this to your existing interactionCreate.js file
// If the file doesn't exist, you'll need to create it with proper structure

// Inside the existing interaction handler, add this condition for handling select menus:
if (interaction.isStringSelectMenu() && interaction.customId === 'help-category') {
    const category = interaction.values[0];
    const embed = new EmbedBuilder().setColor(config.clientOptions.embedColor);
    
    try {
        const commands = fs.readdirSync(path.join(__dirname, "../../commands", category))
            .filter(file => file.endsWith(".js"));
        
        const commandList = [];
        
        for (const file of commands) {
            const command = require(`../../commands/${category}/${file}`);
            commandList.push({
                name: command.data.name,
                description: command.data.description
            });
        }
        
        embed.setTitle(`${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
            .setDescription(`Here are all the available commands in the ${category} category:`)
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `${commandList.length} commands in this category` });
        
        commandList.forEach(cmd => {
            embed.addFields({ name: `/${cmd.name}`, value: cmd.description, inline: false });
        });
        
        // Keep the dropdown menu for category selection
        const categories = fs.readdirSync(path.join(__dirname, "../../commands"))
            .filter(dir => !dir.includes("."));
            
        const categoryIcons = {
            'music': '🎵',
            'filter': '🔊',
            'playlist': '📂',
            'information': '📋',
            'setting': '<:gears:1382066879711150210>',
            'developer': '👑'
        };
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help-category')
            .setPlaceholder('Select a category')
            .addOptions(categories.map(cat => {
                const cmds = fs.readdirSync(path.join(__dirname, "../../commands", cat))
                    .filter(file => file.endsWith(".js"));
                return {
                    label: `${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
                    description: `View ${cat} commands (${cmds.length})`,
                    value: cat,
                    emoji: categoryIcons[cat] || '📁'
                };
            }));
            
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        // Create buttons for navigation
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('help-home')
                .setLabel('Home')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🏠'),
            new ButtonBuilder()
                .setCustomId('help-search')
                .setLabel('Search')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔍'),
            new ButtonBuilder()
                .setCustomId('help-all')
                .setLabel('All Commands')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📋')
        );
        
        return interaction.update({ 
            embeds: [embed], 
            components: [row, buttons] 
        });
        
    } catch (err) {
        logger(err, "error");
        return interaction.update({
            embeds: [embed.setDescription(`\`❌\` | An error occurred: ${err.message}`)],
            components: []
        });
    }
}

// Handle button interactions for help menu
if (interaction.isButton() && interaction.customId.startsWith('help-')) {
    const action = interaction.customId.split('-')[1];
    const embed = new EmbedBuilder().setColor(config.clientOptions.embedColor);
    
    try {
        const categories = fs.readdirSync(path.join(__dirname, "../../commands"))
            .filter(dir => !dir.includes("."));
            
        // Count total commands
        let totalCommands = 0;
        categories.forEach(category => {
            const commands = fs.readdirSync(path.join(__dirname, "../../commands", category))
                .filter(file => file.endsWith(".js"));
            totalCommands += commands.length;
        });
        
        if (action === 'home') {
            // Get category icons
            const categoryIcons = {
                'music': '🎵',
                'filter': '🔊',
                'playlist': '📂',
                'information': '📋',
                'setting': '<:gears:1382066879711150210>',
                'developer': '👑'
            };
            
            // Display help menu
            embed.setAuthor({ 
                name: `${client.user.username} Help Menu`, 
                iconURL: client.user.displayAvatarURL({ dynamic: true }) 
            })
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .setDescription(
                `<:arrow:1382065941969633415> Total Commands: ${totalCommands}\n` +
                `<:arrow:1382065941969633415> My prefix in this server: /\n\n` +
                `📋 My Modules:`
            );
            
            // Add category fields
            categories.forEach(category => {
                const commands = fs.readdirSync(path.join(__dirname, "../../commands", category))
                    .filter(file => file.endsWith(".js"));
                
                const icon = categoryIcons[category] || '📁';
                embed.addFields({ 
                    name: `${icon} ${category.charAt(0).toUpperCase() + category.slice(1)}`,
                    value: `${commands.length} commands`,
                    inline: true 
                });
            });
            
            // Add decorative footer
            embed.addFields({ 
                name: '\u200B', 
                value: '✨ ⋆｡˚ ⋆｡˚ ☾ ˚｡⋆ ˚｡⋆ ✨ ⋆｡˚ ⋆｡˚ ☾ ˚｡⋆ ˚｡⋆ ✨' 
            });
            
            embed.setFooter({ 
                text: `Made with ❤️ by CodeX Development`,
                iconURL: client.user.displayAvatarURL({ dynamic: true })
            });
        } else if (action === 'all') {
            embed.setTitle('All Commands')
                .setDescription(`Here's a list of all available commands:`)
                .setThumbnail(client.user.displayAvatarURL({ dynamic: true }));
                
            for (const category of categories) {
                const commands = fs.readdirSync(path.join(__dirname, "../../commands", category))
                    .filter(file => file.endsWith(".js"));
                    
                const commandNames = commands.map(file => {
                    const command = require(`../../commands/${category}/${file}`);
                    return `\`/${command.data.name}\``;
                }).join(', ');
                
                embed.addFields({
                    name: `${category.charAt(0).toUpperCase() + category.slice(1)} [${commands.length}]`,
                    value: commandNames || 'No commands',
                    inline: false
                });
            }
            
            embed.setFooter({ text: `Total Commands: ${totalCommands}` });
        }
        
        // Create dropdown for categories
        const categoryIcons = {
            'music': '🎵',
            'filter': '🔊',
            'playlist': '📂',
            'information': '📋',
            'setting': '<:gears:1382066879711150210>',
            'developer': '👑'
        };
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help-category')
            .setPlaceholder('Select a category')
            .addOptions(categories.map(cat => {
                const cmds = fs.readdirSync(path.join(__dirname, "../../commands", cat))
                    .filter(file => file.endsWith(".js"));
                return {
                    label: `${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
                    description: `View ${cat} commands (${cmds.length})`,
                    value: cat,
                    emoji: categoryIcons[cat] || '📁'
                };
            }));
            
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        // Create buttons for navigation
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('help-home')
                .setLabel('Home')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🏠'),
            new ButtonBuilder()
                .setCustomId('help-search')
                .setLabel('Search')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔍'),
            new ButtonBuilder()
                .setCustomId('help-all')
                .setLabel('All Commands')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📋')
        );
        
        return interaction.update({ 
            embeds: [embed], 
            components: [row, buttons] 
        });
        
    } catch (err) {
        logger(err, "error");
        return interaction.update({
            embeds: [embed.setDescription(`\`❌\` | An error occurred: ${err.message}`)],
            components: []
        });
    }
}
