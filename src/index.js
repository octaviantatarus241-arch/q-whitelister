require('dotenv').config();
const mongoose = require('mongoose');
const client = require('./bot/client');
const app = require('./api/server');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/q-whitelister');
    console.log('Connected to MongoDB');

    // Start Discord bot
    await client.login(process.env.DISCORD_TOKEN);
    console.log('Discord bot started');

    // Start Express API + Website
    app.listen(PORT, () => {
      console.log(`API + Website running on http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
