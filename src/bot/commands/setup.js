const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Guild, Project } = require('../../database/models');
const { t } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure the bot for this server')
    .addStringOption(opt =>
      opt.setName('project_id')
        .setDescription('Your project ID from the website dashboard')
        .setRequired(true)
    )
    .addRoleOption(opt =>
      opt.setName('manager_role')
        .setDescription('Role that can use management commands')
        .setRequired(true)
    )
    .addRoleOption(opt =>
      opt.setName('buyer_role')
        .setDescription('Role given automatically to whitelisted users')
        .setRequired(false)
    ),

  async execute(interaction) {
    const locale = interaction.locale;
    await interaction.deferReply({ ephemeral: true });

    // Only admins can setup
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.editReply({ content: t(locale, 'common.no_permission') });
    }

    try {
      const projectId = interaction.options.getString('project_id');
      const managerRole = interaction.options.getRole('manager_role');
      const buyerRole = interaction.options.getRole('buyer_role');

      // Verify project exists
      const project = await Project.findById(projectId);
      if (!project) {
        return interaction.editReply({ content: 'Invalid project ID. Create a project on the website first.' });
      }

      // Check ownership
      if (project.ownerId !== interaction.user.id) {
        return interaction.editReply({ content: 'You can only link projects that you own.' });
      }

      await Guild.findOneAndUpdate(
        { guildId: interaction.guildId },
        {
          guildId: interaction.guildId,
          ownerId: interaction.user.id,
          projectId: project._id,
          managerRoleId: managerRole.id,
          buyerRoleId: buyerRole ? buyerRole.id : null
        },
        { upsert: true, new: true }
      );

      await interaction.editReply({
        content: `✅ Server configured successfully!\n• Project: **${project.name}**\n• Manager Role: ${managerRole}\n• Buyer Role: ${buyerRole || 'None'}`
      });

    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: t(locale, 'common.error') });
    }
  }
};
