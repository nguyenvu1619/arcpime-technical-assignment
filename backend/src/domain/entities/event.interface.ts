export type EventStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface EventEntity {
  id: string
  topic: string
  name: string
  key: string
  payload: Record<string, unknown>
  status: EventStatus
  attemptCount: number
  createdAt: Date
  updatedAt: Date
}
