'use strict';

module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define('Company', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    createdByRecruiterId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'RecruiterProfiles',
        key: 'id'
      }
    },
    logo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    website: {
      type: DataTypes.STRING,
      allowNull: true
    },
    industry: {
      type: DataTypes.STRING,
      allowNull: true
    },
    size: {
      type: DataTypes.STRING, // e.g., '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'
      allowNull: true
    },
    founded: {
      type: DataTypes.INTEGER, // Year founded
      allowNull: true
    },
    headquarters: {
      type: DataTypes.STRING,
      allowNull: true
    },
    locations: {
      type: DataTypes.TEXT, // Changed from ARRAY for SQLite compatibility
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('locations');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('locations', JSON.stringify(value));
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    mission: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    culture: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    benefits: {
      type: DataTypes.TEXT, // Changed from ARRAY for SQLite compatibility
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('benefits');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('benefits', JSON.stringify(value));
      }
    },
    socialMedia: {
      type: DataTypes.TEXT, // Changed from JSONB for SQLite compatibility
      defaultValue: '{}',
      get() {
        const value = this.getDataValue('socialMedia');
        return value ? JSON.parse(value) : {};
      },
      set(value) {
        this.setDataValue('socialMedia', JSON.stringify(value));
      }
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    subscriptionTier: {
      type: DataTypes.STRING, // Changed from ENUM for SQLite compatibility
      defaultValue: 'free',
      validate: {
        isIn: [['free', 'basic', 'premium', 'enterprise']]
      }
    },
    subscriptionExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  Company.associate = function(models) {
    Company.belongsToMany(models.RecruiterProfile, {
      through: models.CompanyRecruiter,
      foreignKey: 'companyId',
      otherKey: 'recruiterId',
      as: 'recruiters'
    });
    
    Company.hasMany(models.Job, {
      foreignKey: 'companyId',
      as: 'jobs'
    });
    
    Company.belongsTo(models.RecruiterProfile, {
      foreignKey: 'createdByRecruiterId',
      as: 'creator'
    });
  };

  return Company;
}; 