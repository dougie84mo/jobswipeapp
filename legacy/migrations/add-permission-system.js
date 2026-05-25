'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Create JobRecruiter table for job permissions
      await queryInterface.createTable('JobRecruiters', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        jobId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Jobs',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        recruiterId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'RecruiterProfiles',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        permissionLevel: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'shared',
          validate: {
            isIn: [['owner', 'shared-owner', 'shared']]
          }
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });

      // Add unique constraint to prevent duplicate permissions
      await queryInterface.addConstraint('JobRecruiters', {
        fields: ['jobId', 'recruiterId'],
        type: 'unique',
        name: 'job_recruiter_unique'
      });

      console.log('Migration completed successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('Migration failed:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Drop the JobRecruiter table
      await queryInterface.dropTable('JobRecruiters');

      console.log('Rollback completed successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('Rollback failed:', error);
      return Promise.reject(error);
    }
  }
}; 