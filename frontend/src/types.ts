export interface Item {
  id: number
  sku: string
  color: string
  size: string
  qty: number
}

export interface Box {
  boxId: number
  items: Item[]
}

export interface SkuConfig {
  colors: string[]
  sizes: string[]
}

export type Catalog = Record<string, SkuConfig>
