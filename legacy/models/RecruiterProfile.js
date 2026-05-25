'use strict';

module.exports = (sequelize, DataTypes) => {
  const RecruiterProfile = sequelize.define('RecruiterProfile', {
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
    title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true
    },
    hiringGoals: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    specialties: {
      type: DataTypes.TEXT,
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('specialties');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('specialties', JSON.stringify(value));
      }
    },
    linkedinUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verificationDocuments: {
      type: DataTypes.TEXT,
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('verificationDocuments');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('verificationDocuments', JSON.stringify(value));
      }
    },
    activeJobPostings: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    monthlyJobPostingLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 5 // Default limit for free tier
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  });

  RecruiterProfile.associate = function(models) {
    RecruiterProfile.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'CASCADE'
    });
    
    RecruiterProfile.belongsToMany(models.Company, {
      through: models.CompanyRecruiter,
      foreignKey: 'recruiterId',
      otherKey: 'companyId',
      as: 'companies'
    });
    
    RecruiterProfile.hasMany(models.Job, {
      foreignKey: 'recruiterId',
      as: 'jobs'
    });
    
    RecruiterProfile.hasMany(models.Company, {
      foreignKey: 'createdByRecruiterId',
      as: 'createdCompanies'
    });

    RecruiterProfile.belongsToMany(models.Job, {
      through: models.JobRecruiter,
      foreignKey: 'recruiterId',
      otherKey: 'jobId',
      as: 'sharedJobs'
    });
  };

  return RecruiterProfile;
}; 