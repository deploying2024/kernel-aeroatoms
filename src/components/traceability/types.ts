export type Unit = {
  serial        : string
  status        : string
  order_id      : string | null
  shipped_at    : string | null
  customer_id   : string | null
  customer_name : string | null
}

export type Batch = {
  id          : string
  batch_name  : string
  qty         : number
  notes       : string | null
  created_at  : string
  product_name: string
  units       : Unit[]
}

export type Product = {
  id  : string
  name: string
}

export type Company = {
  id  : string
  name: string
}

export type Order = {
  id          : string
  company_id  : string
  company_name: string
  created_at  : string
}