'use strict';

module.exports = (sequelize, DataTypes) => {
  const JobRecruiter = sequelize.define('JobRecruiter', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    jobId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Jobs',
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
    permissionLevel: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'shared',
      validate: {
        isIn: [['owner', 'shared-owner', 'shared']]
      }
    }
  });

  JobRecruiter.associate = function(models) {
    // Add associations for easier querying
    JobRecruiter.belongsTo(models.Job, {
      foreignKey: 'jobId',
      as: 'job'
    });
    
    JobRecruiter.belongsTo(models.RecruiterProfile, {
      foreignKey: 'recruiterId',
      as: 'recruiter'
    });
  };

  return JobRecruiter;
}; 