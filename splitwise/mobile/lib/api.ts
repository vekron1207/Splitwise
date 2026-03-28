import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type {
  AuthResponse, LoginRequest, SignupRequest,
  GroupResponse, CreateGroupRequest, AddMemberRequest,
  ExpenseResponse, CreateExpenseRequest, PageResponse,
  BalanceResponse, SimplifiedDebtResponse,
  SettlementResponse, SettleDebtRequest,
  BalanceSummaryResponse, UserSummary,
} from './types'

// Change this to your computer's local IP when testing on a physical device
// e.g. 'http://192.168.1.5:8080'  (find with ipconfig on Windows)
// For Android emulator use: 'http://10.0.2.2:8080'
// For iOS simulator use:    'http://localhost:8080'
export const BASE_URL = 'http://10.0.2.2:8080'

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await AsyncStorage.multiRemove(['token', 'user'])
      // Navigation to login handled by auth store listener
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login: (data: LoginRequest) => api.post<AuthResponse>('/auth/login', data),
  signup: (data: SignupRequest) => api.post<AuthResponse>('/auth/signup', data),
}

export const groupsApi = {
  list: () => api.get<GroupResponse[]>('/groups'),
  get: (id: number) => api.get<GroupResponse>(`/groups/${id}`),
  create: (data: CreateGroupRequest) => api.post<GroupResponse>('/groups', data),
  update: (id: number, data: CreateGroupRequest) => api.put<GroupResponse>(`/groups/${id}`, data),
  delete: (id: number) => api.delete(`/groups/${id}`),
  addMember: (id: number, data: AddMemberRequest) => api.post<GroupResponse>(`/groups/${id}/members`, data),
  removeMember: (groupId: number, userId: number) => api.delete(`/groups/${groupId}/members/${userId}`),
}

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

export const balancesApi = {
  all: (groupId: number) => api.get<BalanceResponse[]>(`/groups/${groupId}/balances`),
  simplified: (groupId: number) => api.get<SimplifiedDebtResponse[]>(`/groups/${groupId}/balances/simplified`),
}

export const settlementsApi = {
  list: (groupId: number) => api.get<SettlementResponse[]>(`/groups/${groupId}/settlements`),
  create: (groupId: number, data: SettleDebtRequest) =>
    api.post<SettlementResponse>(`/groups/${groupId}/settlements`, data),
}

export const usersApi = {
  balanceSummary: () => api.get<BalanceSummaryResponse>('/users/balance-summary'),
  search: (q: string) => api.get<UserSummary[]>('/users/search', { params: { q } }),
}
