export type Company = {
  id   : string
  name : string
}

export type Product = {
  id         : string
  name       : string
  unit_price : number
}

export type OrderItem = {
  id            : string
  product_id    : string
  product_name  : string
  quantity      : number
  price_per_unit: number
  line_total    : number
}

export type OrderRow = {
  order_id    : string
  order_date  : string
  company_id  : string
  company_name: string
  item_id     : string
  product_id  : string
  product_name: string
  quantity    : number
  price_per_unit: number
  line_total  : number
}

// Grouped order (one order with multiple items)
export type GroupedOrder = {
  order_id    : string
  order_date  : string
  company_id  : string
  company_name: string
  items       : OrderItem[]
  total       : number
}

export type Vendor = {
  id  : string
  name: string
}

export type Material = {
  id         : string
  name       : string
  type       : string
  description: string | null
}

export type StockEntry = {
  entry_id      : string
  material_id   : string
  material_name : string
  material_type : string
  description   : string | null
  vendor_id     : string
  vendor_name   : string
  inscanned     : number
  outscanned    : number
  remaining     : number
  unit_cost     : number | null
  received_at   : string
  notes         : string | null
}

export type OutscanLog = {
  id             : string
  material_id    : string
  stock_entry_id : string
  quantity_taken : number
  reason         : string | null
  taken_at       : string
  created_at     : string
  // joined
  material_name? : string
  vendor_name?   : string
}

export type PcbBatch = {
  id              : string
  batch_name      : string
  product_id      : string | null
  product_name?   : string
  total_units     : number
  working_units   : number
  defect_units    : number
  defect_reason   : string | null
  notes           : string | null
  manufactured_at : string
  created_at      : string
}

export type PcbDefect = {
  id       : string
  batch_id : string
  reason   : string
  count    : number
}
export type ShippingLabel = {
  id                : string
  recipient_name    : string
  recipient_company : string | null
  recipient_address : string
  recipient_city    : string
  recipient_pincode : string
  recipient_phone   : string
  notes             : string | null
  created_at        : string
  updated_at        : string
}