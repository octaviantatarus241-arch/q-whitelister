const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Key, Guild } = require('../../database/models');
const { generateKey } = require('../../utils/keyGenerator');
const { t } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mass-whitelist')
    .setDescription('Whitelist all members who have a specific role')
    .addRoleOption(opt =>
      opt.setName('role')
        .setDescription('The role to mass-whitelist')
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
      const guildConfig = await Guild.findOne({ guildId: interaction.guildId });
      if (!guildConfig || !guildConfig.projectId) {
        return interaction.editReply({ content: t(locale, 'common.error') + ' (Project not linked)' });
      }

      if (guildConfig.managerRoleId) {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        if (!member.roles.cache.has(guildConfig.managerRoleId) &&
            !member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply({ content: t(locale, 'common.no_permission') });
        }
      }

      const role = interaction.options.getRole('role');
      const days = interaction.options.getInteger('days');

      await interaction.editReply({
        content: t(locale, 'mass_whitelist.started', { role: role.name })
      });

      // Fetch all members with that role
      await interaction.guild.members.fetch();
      const members = interaction.guild.members.cache.filter(m => m.roles.cache.has(role.id) && !m.user.bot);

      let success = 0;
      let failed = 0;

      for (const [, member] of members) {
        const existing = await Key.findOne({
          projectId: guildConfig.projectId,
          discordId: member.id
        });

        if (existing && !existing.blacklisted) {
          failed++;
          continue;
        }

        if (existing) {
          existing.blacklisted = false;
          existing.expiresAt = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
          await existing.save();
        } else {
          await Key.create({
            key: generateKey(),
            projectId: guildConfig.projectId,
            discordId: member.id,
            expiresAt: days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null
          });
        }

        // Give buyer role
        if (guildConfig.buyerRoleId) {
          try {
            await member.roles.add(guildConfig.buyerRoleId);
          } catch (e) {}
        }

        success++;
      }

      await interaction.editReply({
        content: t(locale, 'mass_whitelist.finished', {
          success,
          failed,
          total: members.size
        })
      });

    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: t(locale, 'common.error') });
    }
  }
};
