'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add salaryType field to Jobs table
    await queryInterface.addColumn('Jobs', 'salaryType', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'yearly',
      validate: {
        isIn: [['hourly', 'hourly-with-overtime', 'per-diem', 'weekly', 'bi-weekly', 'monthly', 'yearly', 'project-based', 'commission']]
      }
    });

    // Modify salaryCurrency field to include validation for common currencies
    await queryInterface.changeColumn('Jobs', 'salaryCurrency', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'USD',
      validate: {
        isIn: [['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'BRL', 'MXN', 'ZAR', 'SGD', 'HKD', 'CHF', 'SEK', 'NZD', 'THB', 'IDR', 'RUB', 'AED']]
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove salaryType field
    await queryInterface.removeColumn('Jobs', 'salaryType');

    // Revert salaryCurrency field to original definition
    await queryInterface.changeColumn('Jobs', 'salaryCurrency', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'USD'
    });
  }
}; 