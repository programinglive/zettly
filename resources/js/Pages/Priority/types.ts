export interface Task {
  id: number
  title: string
  queue_state?: string
  due_date?: string | null
  deadline?: string | null
  position?: number
  is_main_work?: boolean
  is_p0?: boolean
  warning?: string
  [key: string]: any
}

export interface PriorityData {
  today: Task[]
  next: Task[]
  proposal: Task[]
  triage: Task[]
  warnings: Task[]
}
