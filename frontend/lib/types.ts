export interface AuthResponse {
  token: string
  userId: number
  name: string
  email: string
}

export interface UserSummary {
  id: number
  name: string
  email: string
}

export interface MemberResponse {
  id: number
  user: UserSummary
  role: 'ADMIN' | 'MEMBER'
  joinedAt: string
}

export interface GroupResponse {
  id: number
  name: string
  description: string
  createdBy: UserSummary
  members: MemberResponse[]
  createdAt: string
}

export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE'
export type ExpenseCategory = 'FOOD' | 'TRAVEL' | 'UTILITIES' | 'ACCOMMODATION' | 'OTHER'

export interface SplitResponse {
  userId: number
  userName: string
  amount: number
  percentage: number
}

export interface AttachmentResponse {
  id: number
  originalName: string
  contentType: string
  fileSize: number
  downloadUrl: string
  uploadedBy: UserSummary
  uploadedAt: string
}

export interface ExpenseResponse {
  id: number
  groupId: number
  paidBy: UserSummary
  title: string
  description: string
  amount: number
  splitType: SplitType
  category: ExpenseCategory
  splits: SplitResponse[]
  attachments: AttachmentResponse[]
  createdAt: string
  updatedAt: string
}

export interface BalanceSummaryResponse {
  totalOwed: number
  totalOwe: number
  netBalance: number
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface BalanceResponse {
  fromUserId: number
  fromUserName: string
  toUserId: number
  toUserName: string
  amount: number
}

export interface SimplifiedDebtResponse {
  fromUserId: number
  fromUserName: string
  toUserId: number
  toUserName: string
  amount: number
}

export interface SettlementResponse {
  id: number
  groupId: number
  paidBy: UserSummary
  paidTo: UserSummary
  amount: number
  note: string
  createdAt: string
}

// Request types
export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  name: string
  email: string
  password: string
}

export interface CreateGroupRequest {
  name: string
  description?: string
}

export interface SplitRequest {
  userId: number
  amount?: number
  percentage?: number
}

export interface CreateExpenseRequest {
  title: string
  description?: string
  amount: number
  splitType: SplitType
  category?: ExpenseCategory
  paidBy?: number
  splits: SplitRequest[]
}

export interface SettleDebtRequest {
  paidTo: number
  amount: number
  note?: string
}

export interface AddMemberRequest {
  email: string
}
