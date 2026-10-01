const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Key, Guild } = require('../../database/models');
const { generateKey } = require('../../utils/keyGenerator');
const { t } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Whitelist a user (create key + link Discord ID)')
    .addUserOption(opt => 
      opt.setName('user')
        .setDescription('The user to whitelist')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('days')
        .setDescription('Number of days (leave empty for lifetime)')
        .setMinValue(1)
        .setMaxValue(3650)
    ),

  async execute(interaction) {
    const locale = interaction.locale;
    await interaction.deferReply({ ephemeral: true });

    try {
      // Check if guild is configured
      const guildConfig = await Guild.findOne({ guildId: interaction.guildId });
      if (!guildConfig || !guildConfig.projectId) {
        return interaction.editReply({
          content: t(locale, 'common.error') + ' (Project not linked. Use /setup first)'
        });
      }

      // Check manager role
      if (guildConfig.managerRoleId) {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        if (!member.roles.cache.has(guildConfig.managerRoleId) && 
            !member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply({ content: t(locale, 'common.no_permission') });
        }
      }

      const targetUser = interaction.options.getUser('user');
      const days = interaction.options.getInteger('days');

      // Check if already has a key
      const existing = await Key.findOne({
        projectId: guildConfig.projectId,
        discordId: targetUser.id
      });

      if (existing && !existing.blacklisted) {
        return interaction.editReply({
          content: t(locale, 'whitelist.already_whitelisted', { user: targetUser.tag })
        });
      }

      // Create or update key
      let keyDoc;
      if (existing) {
        existing.blacklisted = false;
        existing.blacklistReason = '';
        if (days) {
          existing.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        } else {
          existing.expiresAt = null;
        }
        await existing.save();
        keyDoc = existing;
      } else {
        keyDoc = await Key.create({
          key: generateKey(),
          projectId: guildConfig.projectId,
          discordId: targetUser.id,
          expiresAt: days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null
        });
      }

      // Give buyer role if configured
      if (guildConfig.buyerRoleId) {
        try {
          const member = await interaction.guild.members.fetch(targetUser.id);
          await member.roles.add(guildConfig.buyerRoleId);
        } catch (e) {
          console.log('Could not add buyer role:', e.message);
        }
      }

      const message = days
        ? t(locale, 'whitelist.success', { user: targetUser.tag, days })
        : t(locale, 'whitelist.success_lifetime', { user: targetUser.tag });

      await interaction.editReply({ content: message + `\nKey: \`${keyDoc.key}\`` });

    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: t(locale, 'common.error') });
    }
  }
};
