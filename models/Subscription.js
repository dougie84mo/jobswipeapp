'use strict';

module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define('Subscription', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Companies',
        key: 'id'
      }
    },
    planType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['jobseeker', 'recruiter', 'company']]
      }
    },
    tier: {
      type: DataTypes.STRING,
      defaultValue: 'free',
      validate: {
        isIn: [['free', 'basic', 'premium', 'enterprise']]
      }
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    autoRenew: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'USD'
    },
    interval: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [['monthly', 'yearly']]
      }
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'canceled', 'expired', 'pending']]
      }
    },
    features: {
      type: DataTypes.TEXT,
      defaultValue: '{}',
      get() {
        const value = this.getDataValue('features');
        return value ? JSON.parse(value) : {};
      },
      set(value) {
        this.setDataValue('features', JSON.stringify(value));
      }
    },
    canceledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelReason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });

  Subscription.associate = function(models) {
    Subscription.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    Subscription.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company'
    });
    
    Subscription.hasMany(models.SubscriptionTransaction, {
      foreignKey: 'subscriptionId',
      as: 'transactions'
    });
  };

  return Subscription;
}; 