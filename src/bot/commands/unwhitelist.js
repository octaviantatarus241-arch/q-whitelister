const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Key, Guild } = require('../../database/models');
const { t } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unwhitelist')
    .setDescription('Remove whitelist from a user')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The user to unwhitelist')
        .setRequired(true)
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

      const targetUser = interaction.options.getUser('user');

      const keyDoc = await Key.findOne({
        projectId: guildConfig.projectId,
        discordId: targetUser.id
      });

      if (!keyDoc) {
        return interaction.editReply({
          content: t(locale, 'unwhitelist.not_whitelisted', { user: targetUser.tag })
        });
      }

      await Key.deleteOne({ _id: keyDoc._id });

      // Remove buyer role
      if (guildConfig.buyerRoleId) {
        try {
          const member = await interaction.guild.members.fetch(targetUser.id);
          await member.roles.remove(guildConfig.buyerRoleId);
        } catch (e) {}
      }

      await interaction.editReply({
        content: t(locale, 'unwhitelist.success', { user: targetUser.tag })
      });

    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: t(locale, 'common.error') });
    }
  }
};
