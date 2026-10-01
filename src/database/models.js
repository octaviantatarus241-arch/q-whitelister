const mongoose = require('mongoose');

// Project (schema)
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ownerId: { type: String, required: true }, // Discord user ID
  scriptId: { type: String, unique: true },
  loaderScript: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Key / User
const keySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  discordId: { type: String, default: null },
  hwid: { type: String, default: null },
  note: { type: String, default: '' },
  expiresAt: { type: Date, default: null }, // null = lifetime
  blacklisted: { type: Boolean, default: false },
  blacklistReason: { type: String, default: '' },
  totalExecutions: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  lastUsed: { type: Date, default: null }
});

// Guild settings (per Discord server)
const guildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  managerRoleId: { type: String, default: null },
  buyerRoleId: { type: String, default: null },
  logsWebhook: { type: String, default: null },
  panelChannelId: { type: String, default: null },
  panelMessageId: { type: String, default: null }
});

const Project = mongoose.model('Project', projectSchema);
const Key = mongoose.model('Key', keySchema);
const Guild = mongoose.model('Guild', guildSchema);

module.exports = { Project, Key, Guild };
