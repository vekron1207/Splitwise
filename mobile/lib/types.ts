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

export interface SplitResponse {
  userId: number
  userName: string
  amount: number
  percentage?: number
}

export interface ExpenseResponse {
  id: number
  title: string
  description?: string
  amount: number
  splitType: SplitType
  paidBy: UserSummary
  splits: SplitResponse[]
  createdAt: string
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

export interface BalanceSummaryResponse {
  totalOwed: number
  totalOwe: number
  netBalance: number
}

export interface SettlementResponse {
  id: number
  paidBy: UserSummary
  paidTo: UserSummary
  amount: number
  note?: string
  createdAt: string
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  last: boolean
}

export interface LoginRequest { email: string; password: string }
export interface SignupRequest { name: string; email: string; password: string }
export interface CreateGroupRequest { name: string; description?: string }
export interface AddMemberRequest { email: string }
export interface CreateExpenseRequest {
  title: string
  description?: string
  amount: number
  splitType: SplitType
  category: string
  paidBy?: number
  splits: { userId: number; amount?: number; percentage?: number }[]
}
export interface SettleDebtRequest {
  payerId: number
  payeeId: number
  amount: number
  note?: string
}
