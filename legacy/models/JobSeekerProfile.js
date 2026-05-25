'use strict';

module.exports = (sequelize, DataTypes) => {
  const JobSeekerProfile = sequelize.define('JobSeekerProfile', {
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
    summary: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    experience: {
      type: DataTypes.INTEGER, // Years of experience
      allowNull: true
    },
    education: {
      type: DataTypes.TEXT, // Changed from JSONB for SQLite compatibility
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('education');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('education', JSON.stringify(value));
      }
    },
    workHistory: {
      type: DataTypes.TEXT, // Changed from JSONB for SQLite compatibility
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('workHistory');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('workHistory', JSON.stringify(value));
      }
    },
    skills: {
      type: DataTypes.TEXT, // Changed from ARRAY for SQLite compatibility
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('skills');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('skills', JSON.stringify(value));
      }
    },
    certifications: {
      type: DataTypes.TEXT, // Changed from JSONB for SQLite compatibility
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('certifications');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('certifications', JSON.stringify(value));
      }
    },
    languages: {
      type: DataTypes.TEXT, // Changed from ARRAY for SQLite compatibility
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('languages');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('languages', JSON.stringify(value));
      }
    },
    resumeUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    portfolioUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    linkedinUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    githubUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    desiredSalary: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    desiredJobTypes: {
      type: DataTypes.TEXT, // Changed from ARRAY for SQLite compatibility
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('desiredJobTypes');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('desiredJobTypes', JSON.stringify(value));
      }
    },
    desiredLocations: {
      type: DataTypes.TEXT, // Changed from ARRAY for SQLite compatibility
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('desiredLocations');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('desiredLocations', JSON.stringify(value));
      }
    },
    desiredIndustries: {
      type: DataTypes.TEXT, // Changed from ARRAY for SQLite compatibility
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('desiredIndustries');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('desiredIndustries', JSON.stringify(value));
      }
    },
    isRemoteOnly: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isOpenToRelocation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isActivelyLooking: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    visibilitySettings: {
      type: DataTypes.TEXT, // Changed from JSONB for SQLite compatibility
      defaultValue: '{"showProfile":true,"showContact":false,"showSalary":false}',
      get() {
        const value = this.getDataValue('visibilitySettings');
        return value ? JSON.parse(value) : {
          showProfile: true,
          showContact: false,
          showSalary: false
        };
      },
      set(value) {
        this.setDataValue('visibilitySettings', JSON.stringify(value));
      }
    }
  });

  JobSeekerProfile.associate = function(models) {
    JobSeekerProfile.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'CASCADE'
    });
  };

  return JobSeekerProfile;
}; 