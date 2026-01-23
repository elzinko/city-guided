import Link from 'next/link'
import { useState, useMemo } from 'react'
import type { Poi } from '@/lib/api'

interface PoiListProps {
  pois: Poi[]
  onPoiHover?: (poi: Poi | null) => void
  selectedPoiId?: string | null
}

const CATEGORIES = ['Tous', 'Monuments', 'Musees', 'Art', 'Insolite', 'Autre'] as const

export function PoiList({ pois, onPoiHover, selectedPoiId }: PoiListProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('Tous')

  const filteredPois = useMemo(() => {
    return pois.filter(poi => {
      const matchesSearch = search === '' || 
        poi.name.toLowerCase().includes(search.toLowerCase()) ||
        poi.shortDescription.toLowerCase().includes(search.toLowerCase())
      
      const matchesCategory = category === 'Tous' || poi.category === category
      
      return matchesSearch && matchesCategory
    })
  }, [pois, search, category])

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = { Tous: pois.length }
    for (const poi of pois) {
      stats[poi.category] = (stats[poi.category] || 0) + 1
    }
    return stats
  }, [pois])

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-4 border-b bg-white">
        <input
          type="text"
          placeholder="Rechercher un POI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <div className="flex gap-2 mt-3 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                category === cat 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat} ({categoryStats[cat] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filteredPois.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Aucun POI trouvé
          </div>
        ) : (
          <ul className="divide-y">
            {filteredPois.map(poi => (
              <li 
                key={poi.id}
                className={`hover:bg-gray-50 transition-colors ${
                  selectedPoiId === poi.id ? 'bg-blue-50' : ''
                }`}
                onMouseEnter={() => onPoiHover?.(poi)}
                onMouseLeave={() => onPoiHover?.(null)}
              >
                <Link href={`/pois/${poi.id}`} className="block p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {poi.name}
                      </h4>
                      <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                        {poi.shortDescription || poi.wikidataDescription || 'Pas de description'}
                      </p>
                    </div>
                    <span className={`ml-3 flex-shrink-0 px-2 py-1 text-xs rounded-full ${
                      getCategoryColor(poi.category)
                    }`}>
                      {poi.category}
                    </span>
                  </div>
                  
                  {poi.otmRate && (
                    <div className="mt-2 flex items-center gap-1">
                      {[...Array(poi.otmRate)].map((_, i) => (
                        <span key={i} className="text-yellow-500 text-xs">★</span>
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Count */}
      <div className="p-3 border-t bg-gray-50 text-sm text-gray-600 text-center">
        {filteredPois.length} POI{filteredPois.length > 1 ? 's' : ''} affichés
      </div>
    </div>
  )
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'Monuments': return 'bg-amber-100 text-amber-800'
    case 'Musees': return 'bg-purple-100 text-purple-800'
    case 'Art': return 'bg-pink-100 text-pink-800'
    case 'Insolite': return 'bg-cyan-100 text-cyan-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}
