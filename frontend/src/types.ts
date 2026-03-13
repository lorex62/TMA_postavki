export interface Item {
  id: number
  sku: string
  qty: number
}

export interface Box {
  boxId: number
  items: Item[]
}
