'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Starting database schema update migration...');
      
      // 1. Add recruiterId and jobSeekerId to Users table
      console.log('Adding recruiterId and jobSeekerId to Users table...');
      await queryInterface.addColumn('Users', 'recruiterId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'RecruiterProfiles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      
      await queryInterface.addColumn('Users', 'jobSeekerId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'JobSeekerProfiles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      
      // 2. Add createdByRecruiterId to Companies table
      console.log('Adding createdByRecruiterId to Companies table...');
      await queryInterface.addColumn('Companies', 'createdByRecruiterId', {
        type: Sequelize.UUID,
        allowNull: true, // Initially allow null for existing records
        references: {
          model: 'RecruiterProfiles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      
      // 3. Create CompanyRecruiters junction table
      console.log('Creating CompanyRecruiters junction table...');
      await queryInterface.createTable('CompanyRecruiters', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        companyId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Companies',
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
        relationTitle: {
          type: Sequelize.STRING,
          allowNull: true,
          defaultValue: 'Recruiter'
        },
        relationType: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'shared-limited'
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
      
      // 4. Migrate existing relationships to the new structure
      console.log('Migrating existing relationships to the new structure...');
      
      // Get all recruiter profiles with companyId
      const recruiterProfiles = await queryInterface.sequelize.query(
        'SELECT id, userId, companyId FROM RecruiterProfiles WHERE companyId IS NOT NULL',
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      
      // For each recruiter profile with a companyId:
      // 1. Create an entry in CompanyRecruiters
      // 2. Set the company's createdByRecruiterId
      for (const profile of recruiterProfiles) {
        if (profile.companyId) {
          // Generate a UUID for the new record
          const newUuid = uuidv4();
          
          // Create entry in CompanyRecruiters
          await queryInterface.sequelize.query(
            `INSERT INTO CompanyRecruiters (id, companyId, recruiterId, relationTitle, relationType, createdAt, updatedAt)
             VALUES (?, ?, ?, 'Recruiter', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            {
              replacements: [newUuid, profile.companyId, profile.id],
              type: queryInterface.sequelize.QueryTypes.INSERT
            }
          );
          
          // Set company's createdByRecruiterId
          await queryInterface.sequelize.query(
            `UPDATE Companies SET createdByRecruiterId = ? WHERE id = ? AND createdByRecruiterId IS NULL`,
            {
              replacements: [profile.id, profile.companyId],
              type: queryInterface.sequelize.QueryTypes.UPDATE
            }
          );
          
          // Update User with recruiterId
          await queryInterface.sequelize.query(
            `UPDATE Users SET recruiterId = ? WHERE id = ?`,
            {
              replacements: [profile.id, profile.userId],
              type: queryInterface.sequelize.QueryTypes.UPDATE
            }
          );
        }
      }
      
      // Get all job seeker profiles
      const jobSeekerProfiles = await queryInterface.sequelize.query(
        'SELECT id, userId FROM JobSeekerProfiles',
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      
      // Update Users with jobSeekerId
      for (const profile of jobSeekerProfiles) {
        await queryInterface.sequelize.query(
          `UPDATE Users SET jobSeekerId = ? WHERE id = ?`,
          {
            replacements: [profile.id, profile.userId],
            type: queryInterface.sequelize.QueryTypes.UPDATE
          }
        );
      }
      
      // 5. Make createdByRecruiterId required for new records
      // This is done after migration to avoid issues with existing records
      await queryInterface.changeColumn('Companies', 'createdByRecruiterId', {
        type: Sequelize.UUID,
        allowNull: false, // Now make it required for new records
        references: {
          model: 'RecruiterProfiles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT' // Prevent deletion of recruiter if they created a company
      });
      
      // 6. Remove companyId from RecruiterProfiles (after migrating the data)
      console.log('Removing companyId from RecruiterProfiles...');
      await queryInterface.removeColumn('RecruiterProfiles', 'companyId');
      
      console.log('Database schema update migration completed successfully!');
      return Promise.resolve();
    } catch (error) {
      console.error('Migration error:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('Starting rollback of database schema update...');
      
      // 1. Add companyId back to RecruiterProfiles
      console.log('Adding companyId back to RecruiterProfiles...');
      await queryInterface.addColumn('RecruiterProfiles', 'companyId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      
      // 2. Migrate data back from CompanyRecruiters to RecruiterProfiles
      console.log('Migrating data back from CompanyRecruiters to RecruiterProfiles...');
      const companyRecruiters = await queryInterface.sequelize.query(
        `SELECT recruiterId, companyId FROM CompanyRecruiters WHERE relationType = 'admin'`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      
      for (const relation of companyRecruiters) {
        await queryInterface.sequelize.query(
          `UPDATE RecruiterProfiles SET companyId = ? WHERE id = ?`,
          {
            replacements: [relation.companyId, relation.recruiterId],
            type: queryInterface.sequelize.QueryTypes.UPDATE
          }
        );
      }
      
      // 3. Remove createdByRecruiterId from Companies
      console.log('Removing createdByRecruiterId from Companies...');
      await queryInterface.removeColumn('Companies', 'createdByRecruiterId');
      
      // 4. Drop CompanyRecruiters junction table
      console.log('Dropping CompanyRecruiters junction table...');
      await queryInterface.dropTable('CompanyRecruiters');
      
      // 5. Remove recruiterId and jobSeekerId from Users
      console.log('Removing recruiterId and jobSeekerId from Users...');
      await queryInterface.removeColumn('Users', 'recruiterId');
      await queryInterface.removeColumn('Users', 'jobSeekerId');
      
      console.log('Rollback of database schema update completed successfully!');
      return Promise.resolve();
    } catch (error) {
      console.error('Rollback error:', error);
      return Promise.reject(error);
    }
  }
}; 