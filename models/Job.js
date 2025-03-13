'use strict';

module.exports = (sequelize, DataTypes) => {
  const Job = sequelize.define('Job', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Title cannot be empty'
        }
      }
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
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Description cannot be empty'
        }
      }
    },
    responsibilities: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    requirements: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('requirements');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('requirements', JSON.stringify(Array.isArray(value) ? value : []));
      }
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isRemote: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isHybrid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    jobType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [['full-time', 'part-time', 'contract', 'internship', 'temporary']],
          msg: 'Job type must be one of: full-time, part-time, contract, internship, temporary'
        }
      }
    },
    experienceLevel: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [['entry', 'mid', 'senior', 'executive']]
      }
    },
    educationLevel: {
      type: DataTypes.STRING,
      allowNull: true
    },
    salaryMin: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    salaryMax: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    salaryCurrency: {
      type: DataTypes.STRING,
      defaultValue: 'USD',
      validate: {
        isIn: {
          args: [['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'BRL', 'MXN', 'ZAR', 'SGD', 'HKD', 'CHF', 'SEK', 'NZD', 'THB', 'IDR', 'RUB', 'AED']],
          msg: 'Currency must be a valid currency code'
        }
      }
    },
    salaryType: {
      type: DataTypes.STRING,
      defaultValue: 'yearly',
      validate: {
        isIn: {
          args: [['hourly', 'hourly-with-overtime', 'per-diem', 'weekly', 'bi-weekly', 'monthly', 'yearly', 'project-based', 'commission']],
          msg: 'Salary type must be one of: hourly, hourly-with-overtime, per-diem, weekly, bi-weekly, monthly, yearly, project-based, commission'
        }
      }
    },
    benefits: {
      type: DataTypes.TEXT,
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('benefits');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('benefits', JSON.stringify(value));
      }
    },
    skills: {
      type: DataTypes.TEXT,
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('skills');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('skills', JSON.stringify(Array.isArray(value) ? value : []));
      }
    },
    industry: {
      type: DataTypes.STRING,
      allowNull: true
    },
    applicationDeadline: {
      type: DataTypes.DATE,
      allowNull: true
    },
    applicationUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active',
      validate: {
        isIn: [['draft', 'active', 'paused', 'filled', 'expired']]
      }
    },
    isPromoted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    promotionExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    applicationCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    matchCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  });

  Job.associate = function(models) {
    Job.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company'
    });
    
    Job.belongsTo(models.RecruiterProfile, {
      foreignKey: 'recruiterId',
      as: 'recruiter'
    });
    
    Job.hasMany(models.Swipe, {
      foreignKey: 'jobId',
      as: 'swipes'
    });
    
    Job.hasMany(models.Match, {
      foreignKey: 'jobId',
      as: 'matches'
    });
  };

  return Job;
}; 