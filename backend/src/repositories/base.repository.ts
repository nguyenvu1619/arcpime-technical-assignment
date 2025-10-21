import { Transaction } from 'sequelize'
import sequelize from '../config/database.js'

export abstract class BaseRepository {
  /**
   * Start a new transaction
   */
  protected static async startTransaction(): Promise<Transaction> {
    return await sequelize.transaction()
  }

  /**
   * Execute a function within a transaction
   * If the function throws an error, the transaction will be rolled back
   * If the function completes successfully, the transaction will be committed
   */
  public static async withTransaction<T>(
    fn: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    const transaction = await this.startTransaction()
    
    try {
      const result = await fn(transaction)
      await transaction.commit()
      return result
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  /**
   * Get the sequelize instance for direct access if needed
   */
  protected static getSequelize() {
    return sequelize
  }

  /**
   * Example of how to use transactions for multiple operations
   * This is a template method that can be overridden by subclasses
   */
  public static async executeInTransaction<T>(
    operations: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    return await this.withTransaction(operations)
  }
}
