'use strict';
const { Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Swipe = sequelize.define('Swipe', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    jobId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Jobs',
        key: 'id'
      }
    },
    jobSeekerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    direction: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['left', 'right']]
      }
    },
    userType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['jobseeker', 'recruiter']]
      }
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    indexes: [
      {
        unique: true,
        fields: ['userId', 'jobId'],
        where: {
          jobId: {
            [Op.ne]: null
          }
        }
      },
      {
        unique: true,
        fields: ['userId', 'jobSeekerId'],
        where: {
          jobSeekerId: {
            [Op.ne]: null
          }
        }
      }
    ]
  });

  Swipe.associate = function(models) {
    Swipe.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    Swipe.belongsTo(models.Job, {
      foreignKey: 'jobId',
      as: 'job'
    });
    
    Swipe.belongsTo(models.User, {
      foreignKey: 'jobSeekerId',
      as: 'jobSeeker'
    });
  };

  return Swipe;
}; 