import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ─── Auth ───────────────────────────────────────────────────────────────────
import type {
  AuthResponse, LoginRequest, SignupRequest,
  GroupResponse, CreateGroupRequest, AddMemberRequest,
  ExpenseResponse, CreateExpenseRequest, PageResponse,
  BalanceResponse, SimplifiedDebtResponse,
  SettlementResponse, SettleDebtRequest,
  BalanceSummaryResponse, AttachmentResponse, UserSummary,
} from './types'

export const authApi = {
  login: (data: LoginRequest) => api.post<AuthResponse>('/auth/login', data),
  signup: (data: SignupRequest) => api.post<AuthResponse>('/auth/signup', data),
  me: () => api.get<AuthResponse>('/auth/me'),
}

// ─── Groups ──────────────────────────────────────────────────────────────────
export const groupsApi = {
  list: () => api.get<GroupResponse[]>('/groups'),
  get: (id: number) => api.get<GroupResponse>(`/groups/${id}`),
  create: (data: CreateGroupRequest) => api.post<GroupResponse>('/groups', data),
  update: (id: number, data: CreateGroupRequest) => api.put<GroupResponse>(`/groups/${id}`, data),
  delete: (id: number) => api.delete(`/groups/${id}`),
  addMember: (id: number, data: AddMemberRequest) => api.post<GroupResponse>(`/groups/${id}/members`, data),
  removeMember: (groupId: number, userId: number) => api.delete(`/groups/${groupId}/members/${userId}`),
}

// ─── Expenses ────────────────────────────────────────────────────────────────
export const expensesApi = {
  list: (groupId: number, page = 0, size = 20) =>
    api.get<PageResponse<ExpenseResponse>>(`/groups/${groupId}/expenses`, {
      params: { page, size, sort: 'createdAt,desc' },
    }),
  create: (groupId: number, data: CreateExpenseRequest) =>
    api.post<ExpenseResponse>(`/groups/${groupId}/expenses`, data),
  update: (groupId: number, expenseId: number, data: CreateExpenseRequest) =>
    api.put<ExpenseResponse>(`/groups/${groupId}/expenses/${expenseId}`, data),
  delete: (groupId: number, expenseId: number) =>
    api.delete(`/groups/${groupId}/expenses/${expenseId}`),
}

// ─── Balances ────────────────────────────────────────────────────────────────
export const balancesApi = {
  all: (groupId: number) => api.get<BalanceResponse[]>(`/groups/${groupId}/balances`),
  simplified: (groupId: number) => api.get<SimplifiedDebtResponse[]>(`/groups/${groupId}/balances/simplified`),
  me: (groupId: number) => api.get<BalanceResponse[]>(`/groups/${groupId}/balances/me`),
}

// ─── Settlements ─────────────────────────────────────────────────────────────
export const settlementsApi = {
  list: (groupId: number) => api.get<SettlementResponse[]>(`/groups/${groupId}/settlements`),
  create: (groupId: number, data: SettleDebtRequest) =>
    api.post<SettlementResponse>(`/groups/${groupId}/settlements`, data),
}

// ─── Attachments ─────────────────────────────────────────────────────────────
export const attachmentsApi = {
  upload: (groupId: number, expenseId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<AttachmentResponse>(
      `/groups/${groupId}/expenses/${expenseId}/attachments`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },
  list: (groupId: number, expenseId: number) =>
    api.get<AttachmentResponse[]>(`/groups/${groupId}/expenses/${expenseId}/attachments`),
  delete: (attachmentId: number) => api.delete(`/attachments/${attachmentId}`),
  downloadUrl: (attachmentId: number) =>
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/attachments/${attachmentId}`,
}

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersApi = {
  balanceSummary: () => api.get<BalanceSummaryResponse>('/users/balance-summary'),
  search: (q: string) => api.get<UserSummary[]>('/users/search', { params: { q } }),
}
