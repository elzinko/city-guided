export type Category = 'Monuments' | 'Musees' | 'Art' | 'Insolite' | 'Autre'

export type Poi = {
  id: string
  name: string
  lat: number
  lng: number
  radiusMeters: number
  category: Category
  shortDescription: string
  fullDescription?: string
  ttsText?: string
  storySegments?: string[]
}
