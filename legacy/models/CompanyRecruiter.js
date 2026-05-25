'use strict';

module.exports = (sequelize, DataTypes) => {
  const CompanyRecruiter = sequelize.define('CompanyRecruiter', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Companies',
        key: 'id'
      }
    },
    recruiterId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'RecruiterProfiles',
        key: 'id'
      }
    },
    relationTitle: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Recruiter'
    },
    permissionLevel: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'shared',
      validate: {
        isIn: [['owner', 'shared-owner', 'shared']]
      }
    }
  });

  CompanyRecruiter.associate = function(models) {
    // Add associations for easier querying
    CompanyRecruiter.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company'
    });
    
    CompanyRecruiter.belongsTo(models.RecruiterProfile, {
      foreignKey: 'recruiterId',
      as: 'recruiter'
    });
  };

  return CompanyRecruiter;
}; 