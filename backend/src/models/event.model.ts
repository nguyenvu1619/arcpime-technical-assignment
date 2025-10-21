import { DataTypes, Model } from 'sequelize'
import sequelize from '../config/database.js'

export type EventStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface EventAttributes {
  id: string
  topic: string
  name: string
  key: string
  payload: Record<string, unknown>
  status: EventStatus
  attempt_count: number
  created_at: Date
  updated_at: Date
}

export interface EventCreationAttributes {
  topic: string
  name: string
  key: string
  payload: Record<string, unknown>
}

export class Event extends Model<EventAttributes, EventCreationAttributes> implements EventAttributes {
  public id!: string
  public topic!: string
  public name!: string
  public key!: string
  public payload!: Record<string, unknown>
  public status!: EventStatus
  public attempt_count!: number
  public readonly created_at!: Date
  public readonly updated_at!: Date
}

Event.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    topic: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    key: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    attempt_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
)

export default Event
