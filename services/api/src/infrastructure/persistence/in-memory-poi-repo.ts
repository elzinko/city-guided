import pois from '../../../../../packages/mocks/pois.json'
import { Poi } from '@city-guided/domain'
import { v4 as uuidv4 } from 'uuid'

export interface PoiRepository {
  findAll(): Promise<Poi[]>
  findById(id: string): Promise<Poi | null>
  create(p: Omit<Poi, 'id'>): Promise<Poi>
  update(id: string, p: Partial<Poi>): Promise<Poi | null>
  delete(id: string): Promise<boolean>
}

export class InMemoryPoiRepository implements PoiRepository {
  private items: Poi[]
  constructor() {
    this.items = pois as Poi[]
  }
  async findAll(): Promise<Poi[]> {
    return this.items
  }
  async findById(id: string): Promise<Poi | null> {
    const found = this.items.find((p) => p.id === id) || null
    return found
  }
  async create(p: Omit<Poi, 'id'>): Promise<Poi> {
    const newPoi: Poi = { id: uuidv4(), ...p }
    this.items.push(newPoi)
    return newPoi
  }
  async update(id: string, p: Partial<Poi>): Promise<Poi | null> {
    const idx = this.items.findIndex((x) => x.id === id)
    if (idx === -1) return null
    const updated = { ...this.items[idx], ...p }
    this.items[idx] = updated
    return updated
  }
  async delete(id: string): Promise<boolean> {
    const idx = this.items.findIndex((x) => x.id === id)
    if (idx === -1) return false
    this.items.splice(idx, 1)
    return true
  }
}