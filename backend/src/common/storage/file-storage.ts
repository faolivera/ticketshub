import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * Generic file storage implementation for persisting data to JSON files
 * @template T The type of data to store
 */
export class FileStorage<T> {
  private readonly filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
  }

  /**
   * Persist data to file as prettified JSON
   * @param data The data to persist
   */
  async persist(data: T): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath)
      await fs.mkdir(dir, { recursive: true })

      // Serialize to prettified JSON
      const json = JSON.stringify(data, null, 2)

      // Write to file
      await fs.writeFile(this.filePath, json, 'utf-8')
    } catch (error) {
      throw new Error(`Failed to persist data to ${this.filePath}: ${error}`)
    }
  }

  /**
   * Read data from file
   * @returns The deserialized data, or undefined if file doesn't exist
   */
  async read(): Promise<T | undefined> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8')
      if (!content.trim()) {
        return undefined
      }
      return JSON.parse(content) as T
    } catch (error) {
      // If file doesn't exist, return undefined (first run)
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return undefined
      }
      throw new Error(`Failed to read data from ${this.filePath}: ${error}`)
    }
  }
}

