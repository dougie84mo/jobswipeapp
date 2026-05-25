'use strict';

module.exports = (sequelize, DataTypes) => {
  const SubscriptionTransaction = sequelize.define('SubscriptionTransaction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Subscriptions',
        key: 'id'
      }
    },
    transactionDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'USD'
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: false
    },
    paymentId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'completed', 'failed', 'refunded']]
      }
    },
    type: {
      type: DataTypes.STRING,
      defaultValue: 'subscription',
      validate: {
        isIn: [['subscription', 'one-time', 'refund']]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.TEXT,
      defaultValue: '{}',
      get() {
        const value = this.getDataValue('metadata');
        return value ? JSON.parse(value) : {};
      },
      set(value) {
        this.setDataValue('metadata', JSON.stringify(value));
      }
    }
  });

  SubscriptionTransaction.associate = function(models) {
    SubscriptionTransaction.belongsTo(models.Subscription, {
      foreignKey: 'subscriptionId',
      as: 'subscription'
    });
  };

  return SubscriptionTransaction;
}; 