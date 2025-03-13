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
    relationType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'shared-limited',
      validate: {
        isIn: [['admin', 'shared-admin', 'shared-limited']]
      }
    }
  });

  CompanyRecruiter.associate = function(models) {
    // This is a junction table, so it doesn't need additional associations
    // The associations are defined in the Company and RecruiterProfile models
  };

  return CompanyRecruiter;
}; 