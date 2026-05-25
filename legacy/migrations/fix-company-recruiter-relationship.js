'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if recruiterId column exists in Companies table
      const tableInfo = await queryInterface.describeTable('Companies');
      
      // If recruiterId column exists, we need to remove it
      if (tableInfo.recruiterId) {
        console.log('Removing recruiterId column from Companies table');
        await queryInterface.removeColumn('Companies', 'recruiterId');
      }
      
      // Ensure companyId exists in RecruiterProfiles table
      const recruiterProfileInfo = await queryInterface.describeTable('RecruiterProfiles');
      
      if (!recruiterProfileInfo.companyId) {
        console.log('Adding companyId column to RecruiterProfiles table');
        await queryInterface.addColumn('RecruiterProfiles', 'companyId', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Companies',
            key: 'id'
          }
        });
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Migration error:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Check if recruiterId column exists in Companies table
      const tableInfo = await queryInterface.describeTable('Companies');
      
      // If recruiterId column doesn't exist, add it back
      if (!tableInfo.recruiterId) {
        console.log('Adding recruiterId column back to Companies table');
        await queryInterface.addColumn('Companies', 'recruiterId', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'RecruiterProfiles',
            key: 'id'
          }
        });
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Migration rollback error:', error);
      return Promise.reject(error);
    }
  }
}; 