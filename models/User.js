'use strict';
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    userType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['jobseeker', 'recruiter']]
      }
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    profilePicture: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    subscriptionTier: {
      type: DataTypes.STRING,
      defaultValue: 'free',
      validate: {
        isIn: [['free', 'basic', 'premium']]
      }
    },
    subscriptionExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastActive: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    recruiterId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'RecruiterProfiles',
        key: 'id'
      }
    },
    jobSeekerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'JobSeekerProfiles',
        key: 'id'
      }
    }
  }, {
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          console.log('Hashing password for new user:', user.email);
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
          console.log('Hashed password:', user.password);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          console.log('Hashing updated password for user:', user.email);
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
          console.log('Hashed password:', user.password);
        }
      }
    }
  });

  User.prototype.validatePassword = async function(password) {
    try {
      console.log('=== validatePassword method ===');
      console.log('User ID:', this.id);
      console.log('User email:', this.email);
      console.log('Stored password hash:', this.password);
      console.log('Provided password:', password);
      
      if (!password || !this.password) {
        console.log('Missing password or hash');
        return false;
      }
      
      const isMatch = await bcrypt.compare(password, this.password);
      console.log('bcrypt.compare result:', isMatch);
      return isMatch;
    } catch (error) {
      console.error('Password validation error:', error);
      return false;
    }
  };

  User.associate = function(models) {
    // Associations for JobSeeker
    User.hasOne(models.JobSeekerProfile, {
      foreignKey: 'userId',
      as: 'jobSeekerProfile',
      onDelete: 'CASCADE'
    });
    
    // Associations for Recruiter
    User.hasOne(models.RecruiterProfile, {
      foreignKey: 'userId',
      as: 'recruiterProfile',
      onDelete: 'CASCADE'
    });
    
    // Messages sent by this user
    User.hasMany(models.Message, {
      foreignKey: 'senderId',
      as: 'sentMessages'
    });
    
    // Swipes initiated by this user
    User.hasMany(models.Swipe, {
      foreignKey: 'userId',
      as: 'swipes'
    });
    
    // Matches where this user is involved
    User.hasMany(models.Match, {
      foreignKey: 'jobSeekerId',
      as: 'jobSeekerMatches'
    });
    
    User.hasMany(models.Match, {
      foreignKey: 'recruiterId',
      as: 'recruiterMatches'
    });
  };

  return User;
}; 