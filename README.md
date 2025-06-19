# CodeX Music Bot

**A feature-rich Discord music bot with advanced filters, playlist management, and multiple platform support.**

## Features

- 🎵 Multi-Platform Support
  - YouTube
  - Spotify
  - SoundCloud
- 🎚️ Advanced Audio Filters
  - 8D
  - Bass Boost
  - Channel Mix
  - Distortion
  - Karaoke
  - Lowpass
  - Nightcore
  - Rotation
  - Slow Mode
  - Timescale
  - Tremolo
  - Vaporwave
  - Vibrato
- 📋 Playlist System
  - Create custom playlists
  - Add/remove songs
  - View playlist info
  - Play entire playlists
- ⚙️ Advanced Settings
  - 24/7 mode
  - Autoplay
  - Control buttons
  - Custom embed colors

## Prerequisites

- Node.js 16.9.0 or newer
- MongoDB database
- Spotify Developer account
- Discord Bot Token
- Lavalink server (included)

## Setup

1. Clone this repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following configuration:
```env
# Discord Bot Configuration
CLIENT_TOKEN=your_bot_token
CLIENT_ID=your_bot_id
DEV_ID=your_discord_id  # Comma-separated for multiple IDs
DEV_GUILD=your_guild_id  # Comma-separated for multiple guilds

# MongoDB Configuration
MONGO_URI=your_mongodb_uri

# Embed Color
EMBED_COLOR=7289DA  # Hex color without #

# Spotify Configuration
SPOTIFY_CLIENTID=your_spotify_client_id
SPOTIFY_SECRET=your_spotify_client_secret

# Default Search Platform
DEFAULT_SEARCH_PLATFORM=spsearch  # Options: ytsearch, ytmsearch, scsearch, spsearch
```

## Commands

### Music Commands
- `/play` - Play a song or playlist
- `/pause` - Pause current playback
- `/resume` - Resume playback
- `/stop` - Stop playback
- `/skip` - Skip current track
- `/previous` - Play previous track
- `/queue` - View current queue
- `/volume` - Adjust volume
- `/lyrics` - Get song lyrics
- `/nowplaying` - Show current track info

### Filter Commands
- `/filter` - Apply audio filters
- `/8d` - Toggle 8D audio effect
- `/bassboost` - Enhance bass
- `/nightcore` - Apply nightcore effect
- And many more audio effects!

### Playlist Commands
- `/pl-create` - Create a new playlist
- `/pl-delete` - Delete a playlist
- `/pl-addSong` - Add song to playlist
- `/pl-removeSong` - Remove song from playlist
- `/pl-info` - View playlist details
- `/pl-list` - List all playlists
- `/pl-play` - Play a playlist

### Settings
- `/247` - Toggle 24/7 mode
- `/autoplay` - Toggle autoplay
- `/controlButtons` - Toggle control buttons

### Information
- `/help` - Show help menu
- `/ping` - Check bot latency
- `/stats` - Show bot statistics

## Configuration

The bot can be configured through the `config.js` file:

### Lavalink Configuration
```javascript
riffyNodes: [
    {
        name: "Lavalink",
        host: "lavalink",
        port: port,
        password: "pass",
        secure: false
    }
]
```

### Player Options
```javascript
riffyOptions: {
    leaveTimeout: "15s",  // Bot leaves after 15s of inactivity
    restVersion: "v4",
    reconnectTries: Infinity,
    reconnectTimeout: "6s",
    defaultSearchPlatform: "spsearch"
}
```

## Support

Join our Discord server for support: [discord.gg/sV5nAs4NtH](https://https//discord.gg/sV5nAs4NtH)

## Credits

Created by CodeX Development Team

## License

This project is licensed under the MIT License.
