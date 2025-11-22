'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { GripVertical, Sparkles, Trash2, FileText } from 'lucide-react';
import { Card } from '@/types';

interface KanbanCardProps {
  card: Card;
  onDelete: (id: string) => void;
  onEdit: (card: Card) => void;
  onGeneratePrompt: (card: Card) => void;
  isGenerating: boolean;
  columnColor: string;
}

export default function KanbanCard({
  card,
  onDelete,
  onEdit,
  onGeneratePrompt,
  isGenerating,
  columnColor,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      className={`group relative bg-slate-800 rounded-xl p-4 shadow-lg border border-slate-700
        hover:border-slate-600 transition-all duration-200 cursor-pointer
        ${isDragging ? 'opacity-50 shadow-2xl ring-2 ring-indigo-500' : ''}`}
      onClick={() => onEdit(card)}
    >
      {/* Color accent bar */}
      <div
        className="absolute top-0 left-0 w-1 h-full rounded-l-xl"
        style={{ backgroundColor: columnColor }}
      />

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 p-1 rounded-md opacity-0 group-hover:opacity-100
          hover:bg-slate-700 cursor-grab active:cursor-grabbing transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4 text-slate-400" />
      </div>

      {/* Card content */}
      <div className="pr-8">
        <h3 className="font-semibold text-slate-100 mb-2 line-clamp-2">
          {card.title}
        </h3>
        {card.description && (
          <p className="text-sm text-slate-400 mb-3 line-clamp-2">
            {card.description}
          </p>
        )}

        {/* Notes indicator */}
        {card.notes && (
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
            <FileText className="w-3 h-3" />
            <span>Has notes</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            onGeneratePrompt(card);
          }}
          disabled={isGenerating}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
            bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500
            text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed
            ${isGenerating ? 'ai-glow animate-pulse' : ''}`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generating...' : 'AI Prompt'}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id);
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}
