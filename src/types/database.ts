export type ItemStatus = 'available' | 'low_stock' | 'out_of_stock' | 'discontinued'
export type TransactionType = 'borrow' | 'return' | 'purchase' | 'repair' | 'dispose'
export type TransactionStatus = 'pending' | 'active' | 'completed' | 'cancelled'
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

export interface Category {
  id: string
  name: string
  icon: string
  description: string | null
  created_at: string
}

export interface Item {
  id: string
  name: string
  category_id: string | null
  barcode: string | null
  qr_code: string | null
  quantity: number
  unit: string
  description: string | null
  image_url: string | null
  status: ItemStatus
  min_quantity: number
  created_at: string
  updated_at: string
  // joined
  category?: Category
}

export interface ItemLocation {
  id: string
  item_id: string
  pos_x: number
  pos_y: number
  quantity: number
  label: string | null
  // joined
  item?: Item
}

// --- Classroom Grid System (multi-classroom + versions) ---
export type ClassroomCellType = 'item' | 'furniture' | 'empty'

export interface ClassroomGridCell {
  row: number
  col: number
  type: ClassroomCellType
  item_id?: string    // for 'item' type
  quantity?: number   // for 'item' type
  label?: string      // for 'furniture' type or custom label
  // joined (client-side only)
  item?: Item
}

export interface Classroom {
  id: string
  name: string
  rows: number
  cols: number
  created_at: string
  updated_at: string
}

export interface ClassroomVersion {
  id: string
  classroom_id: string
  name: string
  cells: ClassroomGridCell[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  item_id: string
  type: TransactionType
  quantity: number
  note: string | null
  scanned_code: string | null
  session_token: string | null
  status: TransactionStatus
  due_date: string | null
  created_at: string
  updated_at: string
  // joined
  item?: Item
}

export interface Project {
  id: string
  title: string
  description: string
  ai_response: string | null
  materials_json: MaterialItem[] | null
  equipment_json: EquipmentItem[] | null
  todo_json: TodoItem[] | null
  session_token: string | null
  created_at: string
  updated_at: string
}

export interface MaterialItem {
  name: string
  quantity: number
  unit: string
  in_classroom: boolean
  item_id?: string
}

export interface EquipmentItem {
  name: string
  in_classroom: boolean
  item_id?: string
  note?: string
}

export interface TodoItem {
  step: number
  task: string
  done: boolean
  materials?: string[]
  equipment?: string[]
}

export interface KnowledgeEntry {
  id: string
  title: string
  url: string
  source: string
  description: string
  tags: string[]
  required_materials: string[]
  required_equipment: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  image_url: string | null
  created_at: string
}

export interface Booking {
  id: string
  project_id: string | null
  title: string
  equipment_items: string[]
  start_time: string
  end_time: string
  status: BookingStatus
  session_token: string | null
  note: string | null
  created_at: string
  // joined
  project?: Project
}

// Legacy — kept for backward compat with seed.ts
export interface ClassroomConfig {
  id: string
  name: string
  width: number
  height: number
  background_image: string | null
  updated_at: string
}

export interface AccessCode {
  id: string
  code: string
  label: string | null
  created_by: string
  expires_at: string | null
  is_active: boolean
  created_at: string
}
