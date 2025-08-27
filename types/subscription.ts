export interface Subscription {
  id: string
  status: string
  end_date: string
  plan_type: string
  price: number
  payment_method?: string
  member_id?: string
  start_date?: string
  auto_renew?: boolean
  created_at?: string
  updated_at?: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  duration: number
  features: string[]
}

export interface Invoice {
  id: string
  member_id: string
  subscription_id?: string
  amount: number
  due_date: string
  status: string
  payment_method?: string
  created_at: string
  updated_at: string
}
