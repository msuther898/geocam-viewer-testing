'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MoreHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Card, Column } from '@/types';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
  column: Column;
  cards: Card[];
  onAddCard: (columnId: string, title: string) => void;
  onDeleteCard: (cardId: string) => void;
  onEditCard: (card: Card) => void;
  onDeleteColumn: (columnId: string) => void;
  onGeneratePrompt: (card: Card) => void;
  generatingCardId: string | null;
}

export default function KanbanColumn({
  column,
  cards,
  onAddCard,
  onDeleteCard,
  onEditCard,
  onDeleteColumn,
  onGeneratePrompt,
  generatingCardId,
}: KanbanColumnProps) {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const handleAddCard = () => {
    if (newCardTitle.trim()) {
      onAddCard(column.id, newCardTitle.trim());
      setNewCardTitle('');
      setIsAddingCard(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCard();
    } else if (e.key === 'Escape') {
      setIsAddingCard(false);
      setNewCardTitle('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex flex-col w-80 min-w-80 bg-slate-900/50 rounded-2xl p-4
        border border-slate-700/50 backdrop-blur-sm
        ${isOver ? 'ring-2 ring-indigo-500/50 bg-slate-800/50' : ''}`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h2 className="font-bold text-slate-200 text-lg">{column.title}</h2>
          <span className="px-2 py-0.5 text-xs font-medium bg-slate-700 text-slate-300 rounded-full">
            {cards.length}
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-8 z-10 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-1 min-w-32"
              >
                <button
                  onClick={() => {
                    onDeleteColumn(column.id);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete column
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Cards container */}
      <div
        ref={setNodeRef}
        className="flex-1 flex flex-col gap-3 min-h-[200px] overflow-y-auto pr-1"
      >
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence mode="popLayout">
            {cards.map((card) => (
              <KanbanCard
                key={card.id}
                card={card}
                onDelete={onDeleteCard}
                onEdit={onEditCard}
                onGeneratePrompt={onGeneratePrompt}
                isGenerating={generatingCardId === card.id}
                columnColor={column.color}
              />
            ))}
          </AnimatePresence>
        </SortableContext>
      </div>

      {/* Add card section */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <AnimatePresence mode="wait">
          {isAddingCard ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <input
                type="text"
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter card title..."
                autoFocus
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg
                  text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2
                  focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddCard}
                  className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white
                    rounded-lg font-medium transition-colors"
                >
                  Add Card
                </button>
                <button
                  onClick={() => {
                    setIsAddingCard(false);
                    setNewCardTitle('');
                  }}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200
                    rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsAddingCard(true)}
              className="flex items-center gap-2 w-full px-3 py-2 text-slate-400
                hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add a card</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
