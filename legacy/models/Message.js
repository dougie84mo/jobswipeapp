'use strict';

module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    matchId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Matches',
        key: 'id'
      }
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    attachments: {
      type: DataTypes.TEXT,
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('attachments');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('attachments', JSON.stringify(value));
      }
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    type: {
      type: DataTypes.STRING,
      defaultValue: 'text',
      validate: {
        isIn: [['text', 'image', 'file', 'system']]
      }
    }
  });

  Message.associate = function(models) {
    Message.belongsTo(models.Match, {
      foreignKey: 'matchId',
      as: 'match'
    });
    
    Message.belongsTo(models.User, {
      foreignKey: 'senderId',
      as: 'sender'
    });
  };

  return Message;
}; 