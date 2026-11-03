import { useState, type ReactNode } from 'react'
import { TONES, type Tone } from '../lib/constants'
import { cx } from './ui'

/** Kanban desktop : glisser-déposer natif HTML5 entre colonnes de statut. */
export function Kanban<T extends { id: string }, S extends string>({ columns, items, statusOf, onMove, renderCard }: {
  columns: { value: S; label: string; tone: Tone }[]
  items: T[]
  statusOf: (item: T) => S
  onMove: (item: T, to: S) => void
  renderCard: (item: T) => ReactNode
}) {
  const [over, setOver] = useState<S | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-8 px-8 snap-x">
      {columns.map((col) => {
        const list = items.filter((i) => statusOf(i) === col.value)
        return (
          <div
            key={col.value}
            onDragOver={(e) => { e.preventDefault(); setOver(col.value) }}
            onDragLeave={() => setOver((o) => (o === col.value ? null : o))}
            onDrop={(e) => {
              e.preventDefault(); setOver(null)
              const item = items.find((i) => i.id === e.dataTransfer.getData('text/plain'))
              if (item && statusOf(item) !== col.value) onMove(item, col.value)
            }}
            className={cx('w-[272px] shrink-0 rounded-2xl p-2 transition-colors snap-start', over === col.value ? 'bg-copper/8 ring-1 ring-copper/30' : 'bg-sunken/70')}
          >
            <div className="flex items-center gap-2 px-2 pt-1 pb-2.5">
              <span className={cx('w-2 h-2 rounded-full', TONES[col.tone].dot)} />
              <span className="text-[13px] font-bold flex-1 truncate">{col.label}</span>
              <span className="tabular text-[12px] font-bold text-faint">{list.length}</span>
            </div>
            <div className="flex flex-col gap-2 min-h-[60px]">
              {list.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('text/plain', item.id); e.dataTransfer.effectAllowed = 'move'; setDragId(item.id) }}
                  onDragEnd={() => setDragId(null)}
                  className={cx('cursor-grab active:cursor-grabbing transition-opacity', dragId === item.id && 'opacity-40')}
                >
                  {renderCard(item)}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
