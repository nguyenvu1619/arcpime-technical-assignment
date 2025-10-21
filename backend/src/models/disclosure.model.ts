import { DataTypes, Model } from 'sequelize'
import type { Optional } from 'sequelize'
import sequelize from '../config/database.js'
import type { DisclosureEntity, KeyDifference, Inventor, RawExtraction } from '../domain/entities/disclosure.interface.js'

// Define optional attributes for creation
interface DisclosureCreationAttributes extends Optional<DisclosureEntity, 'id' | 'docketNumber' | 'createdAt' | 'updatedAt'> {}

// Define the model class
class Disclosure extends Model<DisclosureEntity, DisclosureCreationAttributes> implements DisclosureEntity {
  public id!: string
  public docketNumber!: number
  public title!: string
  public description!: string
  public keyDifferences!: KeyDifference[]
  public inventors!: Inventor[]
  public uri?: string
  public rawExtraction?: RawExtraction
  public publicPlanned?: boolean
  public publicVenue?: string | null
  public publicDate?: Date | null
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

// Initialize the model
Disclosure.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    docketNumber: {
      type: DataTypes.INTEGER,
      field: 'docket_number',
      unique: true,
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    keyDifferences: {
      type: DataTypes.JSONB,
      field: 'key_differences',
      allowNull: false,
    },
    inventors: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    uri: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rawExtraction: {
      type: DataTypes.JSONB,
      field: 'raw_extraction',
      allowNull: true,
    },
    publicPlanned: {
      type: DataTypes.BOOLEAN,
      field: 'public_planned',
      allowNull: false,
      defaultValue: false,
    },
    publicVenue: {
      type: DataTypes.TEXT,
      field: 'public_venue',
      allowNull: true,
    },
    publicDate: {
      type: DataTypes.DATEONLY,
      field: 'public_date',
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'disclosures',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
)

export default Disclosure
