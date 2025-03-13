'use strict';

module.exports = (sequelize, DataTypes) => {
  const Match = sequelize.define('Match', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    jobSeekerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    recruiterId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    jobId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Jobs',
        key: 'id'
      }
    },
    matchDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'archived', 'rejected', 'hired']]
      }
    },
    lastMessageDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    jobSeekerArchived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    recruiterArchived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    matchScore: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    indexes: [
      {
        unique: true,
        fields: ['jobSeekerId', 'jobId']
      }
    ]
  });

  Match.associate = function(models) {
    Match.belongsTo(models.User, {
      foreignKey: 'jobSeekerId',
      as: 'jobSeeker'
    });
    
    Match.belongsTo(models.User, {
      foreignKey: 'recruiterId',
      as: 'recruiter'
    });
    
    Match.belongsTo(models.Job, {
      foreignKey: 'jobId',
      as: 'job'
    });
    
    Match.hasMany(models.Message, {
      foreignKey: 'matchId',
      as: 'messages'
    });
  };

  return Match;
}; 