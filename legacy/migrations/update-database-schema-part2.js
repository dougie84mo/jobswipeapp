'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Starting database schema update migration (part 2)...');
      
      // Check if jobSeekerId column already exists in Users table
      try {
        await queryInterface.describeTable('Users').then(tableInfo => {
          if (!tableInfo.jobSeekerId) {
            console.log('Adding jobSeekerId to Users table...');
            return queryInterface.addColumn('Users', 'jobSeekerId', {
              type: Sequelize.UUID,
              allowNull: true,
              references: {
                model: 'JobSeekerProfiles',
                key: 'id'
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL'
            });
          } else {
            console.log('jobSeekerId column already exists in Users table');
            return Promise.resolve();
          }
        });
      } catch (error) {
        console.error('Error checking/adding jobSeekerId column:', error);
      }
      
      // Check if createdByRecruiterId column already exists in Companies table
      try {
        await queryInterface.describeTable('Companies').then(tableInfo => {
          if (!tableInfo.createdByRecruiterId) {
            console.log('Adding createdByRecruiterId to Companies table...');
            return queryInterface.addColumn('Companies', 'createdByRecruiterId', {
              type: Sequelize.UUID,
              allowNull: true, // Initially allow null for existing records
              references: {
                model: 'RecruiterProfiles',
                key: 'id'
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL'
            });
          } else {
            console.log('createdByRecruiterId column already exists in Companies table');
            return Promise.resolve();
          }
        });
      } catch (error) {
        console.error('Error checking/adding createdByRecruiterId column:', error);
      }
      
      // Check if CompanyRecruiters table already exists
      try {
        const tables = await queryInterface.showAllTables();
        if (!tables.includes('CompanyRecruiters')) {
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
        } else {
          console.log('CompanyRecruiters table already exists');
        }
      } catch (error) {
        console.error('Error checking/creating CompanyRecruiters table:', error);
      }
      
      // Migrate existing relationships to the new structure
      console.log('Migrating existing relationships to the new structure...');
      
      // Get all recruiter profiles with companyId
      try {
        const tableInfo = await queryInterface.describeTable('RecruiterProfiles');
        
        if (tableInfo.companyId) {
          const recruiterProfiles = await queryInterface.sequelize.query(
            'SELECT id, userId, companyId FROM RecruiterProfiles WHERE companyId IS NOT NULL',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
          );
          
          // For each recruiter profile with a companyId:
          // 1. Create an entry in CompanyRecruiters
          // 2. Set the company's createdByRecruiterId
          for (const profile of recruiterProfiles) {
            if (profile.companyId) {
              // Check if entry already exists in CompanyRecruiters
              const existingRelation = await queryInterface.sequelize.query(
                'SELECT id FROM CompanyRecruiters WHERE companyId = ? AND recruiterId = ?',
                {
                  replacements: [profile.companyId, profile.id],
                  type: queryInterface.sequelize.QueryTypes.SELECT
                }
              );
              
              if (existingRelation.length === 0) {
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
              }
              
              // Set company's createdByRecruiterId if not already set
              await queryInterface.sequelize.query(
                `UPDATE Companies SET createdByRecruiterId = ? WHERE id = ? AND (createdByRecruiterId IS NULL OR createdByRecruiterId = '')`,
                {
                  replacements: [profile.id, profile.companyId],
                  type: queryInterface.sequelize.QueryTypes.UPDATE
                }
              );
              
              // Update User with recruiterId if not already set
              await queryInterface.sequelize.query(
                `UPDATE Users SET recruiterId = ? WHERE id = ? AND (recruiterId IS NULL OR recruiterId = '')`,
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
          
          // Update Users with jobSeekerId if not already set
          for (const profile of jobSeekerProfiles) {
            await queryInterface.sequelize.query(
              `UPDATE Users SET jobSeekerId = ? WHERE id = ? AND (jobSeekerId IS NULL OR jobSeekerId = '')`,
              {
                replacements: [profile.id, profile.userId],
                type: queryInterface.sequelize.QueryTypes.UPDATE
              }
            );
          }
          
          // Make createdByRecruiterId required for new records
          // This is done after migration to avoid issues with existing records
          try {
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
          } catch (error) {
            console.error('Error making createdByRecruiterId required:', error);
          }
          
          // Remove companyId from RecruiterProfiles (after migrating the data)
          console.log('Removing companyId from RecruiterProfiles...');
          await queryInterface.removeColumn('RecruiterProfiles', 'companyId');
        } else {
          console.log('companyId column already removed from RecruiterProfiles');
        }
      } catch (error) {
        console.error('Error migrating relationships:', error);
      }
      
      console.log('Database schema update migration (part 2) completed successfully!');
      return Promise.resolve();
    } catch (error) {
      console.error('Migration error:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('Starting rollback of database schema update (part 2)...');
      
      // 1. Add companyId back to RecruiterProfiles if it doesn't exist
      try {
        const tableInfo = await queryInterface.describeTable('RecruiterProfiles');
        if (!tableInfo.companyId) {
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
        } else {
          console.log('companyId column already exists in RecruiterProfiles');
        }
      } catch (error) {
        console.error('Error adding companyId back to RecruiterProfiles:', error);
      }
      
      // 3. Remove createdByRecruiterId from Companies if it exists
      try {
        const tableInfo = await queryInterface.describeTable('Companies');
        if (tableInfo.createdByRecruiterId) {
          console.log('Removing createdByRecruiterId from Companies...');
          await queryInterface.removeColumn('Companies', 'createdByRecruiterId');
        } else {
          console.log('createdByRecruiterId column already removed from Companies');
        }
      } catch (error) {
        console.error('Error removing createdByRecruiterId from Companies:', error);
      }
      
      // 4. Drop CompanyRecruiters junction table if it exists
      try {
        const tables = await queryInterface.showAllTables();
        if (tables.includes('CompanyRecruiters')) {
          console.log('Dropping CompanyRecruiters junction table...');
          await queryInterface.dropTable('CompanyRecruiters');
        } else {
          console.log('CompanyRecruiters table already dropped');
        }
      } catch (error) {
        console.error('Error dropping CompanyRecruiters table:', error);
      }
      
      // 5. Remove recruiterId and jobSeekerId from Users if they exist
      try {
        const tableInfo = await queryInterface.describeTable('Users');
        if (tableInfo.recruiterId) {
          console.log('Removing recruiterId from Users...');
          await queryInterface.removeColumn('Users', 'recruiterId');
        } else {
          console.log('recruiterId column already removed from Users');
        }
        
        if (tableInfo.jobSeekerId) {
          console.log('Removing jobSeekerId from Users...');
          await queryInterface.removeColumn('Users', 'jobSeekerId');
        } else {
          console.log('jobSeekerId column already removed from Users');
        }
      } catch (error) {
        console.error('Error removing recruiterId/jobSeekerId from Users:', error);
      }
      
      console.log('Rollback of database schema update (part 2) completed successfully!');
      return Promise.resolve();
    } catch (error) {
      console.error('Rollback error:', error);
      return Promise.reject(error);
    }
  }
}; 