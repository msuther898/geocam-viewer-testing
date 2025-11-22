'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { Plus, Key, Sparkles } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Board, Card, Column, DEFAULT_BOARD } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { generateClaudePrompt } from '@/lib/generatePrompt';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import CardModal from './CardModal';
import AddColumnModal from './AddColumnModal';
import ApiKeyModal from './ApiKeyModal';

export default function KanbanBoard() {
  const [board, setBoard] = useLocalStorage<Board>('kanban-board', DEFAULT_BOARD);
  const [apiKey, setApiKey] = useLocalStorage<string>('openai-api-key', '');

  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [generatingCardId, setGeneratingCardId] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findCardById = useCallback(
    (id: string) => board.cards.find((card) => card.id === id),
    [board.cards]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = findCardById(active.id as string);
    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeCard = findCardById(activeId);
    if (!activeCard) return;

    // Check if over is a column or a card
    const overCard = findCardById(overId);
    const overColumnId = overCard ? overCard.columnId : overId;

    if (activeCard.columnId !== overColumnId) {
      setBoard((prev) => ({
        ...prev,
        cards: prev.cards.map((card) =>
          card.id === activeId ? { ...card, columnId: overColumnId } : card
        ),
      }));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeCard = findCardById(activeId);
    const overCard = findCardById(overId);

    if (!activeCard) return;

    setBoard((prev) => {
      const columnCards = prev.cards.filter(
        (card) => card.columnId === activeCard.columnId
      );
      const activeIndex = columnCards.findIndex((c) => c.id === activeId);
      const overIndex = overCard
        ? columnCards.findIndex((c) => c.id === overId)
        : columnCards.length;

      if (activeIndex !== overIndex && activeIndex !== -1 && overIndex !== -1) {
        const newColumnCards = arrayMove(columnCards, activeIndex, overIndex);
        const otherCards = prev.cards.filter(
          (card) => card.columnId !== activeCard.columnId
        );
        return {
          ...prev,
          cards: [
            ...otherCards,
            ...newColumnCards.map((card, index) => ({ ...card, order: index })),
          ],
        };
      }
      return prev;
    });
  };

  const handleAddCard = (columnId: string, title: string) => {
    const columnCards = board.cards.filter((c) => c.columnId === columnId);
    const newCard: Card = {
      id: uuidv4(),
      title,
      description: '',
      notes: '',
      createdAt: new Date().toISOString(),
      columnId,
      order: columnCards.length,
    };
    setBoard((prev) => ({
      ...prev,
      cards: [...prev.cards, newCard],
    }));
  };

  const handleDeleteCard = (cardId: string) => {
    setBoard((prev) => ({
      ...prev,
      cards: prev.cards.filter((card) => card.id !== cardId),
    }));
  };

  const handleUpdateCard = (updatedCard: Card) => {
    setBoard((prev) => ({
      ...prev,
      cards: prev.cards.map((card) =>
        card.id === updatedCard.id ? updatedCard : card
      ),
    }));
  };

  const handleAddColumn = (title: string, color: string) => {
    const newColumn: Column = {
      id: uuidv4(),
      title,
      order: board.columns.length,
      color,
    };
    setBoard((prev) => ({
      ...prev,
      columns: [...prev.columns, newColumn],
    }));
  };

  const handleDeleteColumn = (columnId: string) => {
    setBoard((prev) => ({
      ...prev,
      columns: prev.columns.filter((col) => col.id !== columnId),
      cards: prev.cards.filter((card) => card.columnId !== columnId),
    }));
  };

  const handleGeneratePrompt = async (card: Card) => {
    if (!apiKey) {
      setIsApiKeyOpen(true);
      return;
    }

    setGeneratingCardId(card.id);
    setGeneratedPrompt(null);

    try {
      const prompt = await generateClaudePrompt(card.title, card.description, apiKey);
      setGeneratedPrompt(prompt);
      setEditingCard(card);
    } catch (error) {
      console.error('Error generating prompt:', error);
      alert('Failed to generate prompt. Please check your API key and try again.');
    } finally {
      setGeneratingCardId(null);
    }
  };

  const getColumnCards = (columnId: string) =>
    board.cards
      .filter((card) => card.columnId === columnId)
      .sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Vibe Board</h1>
                <p className="text-sm text-slate-400">AI-Powered Project Management</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsApiKeyOpen(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                  apiKey
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Key className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {apiKey ? 'API Key Set' : 'Set API Key'}
                </span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsAddColumnOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500
                  text-white rounded-xl font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Column
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="p-6 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 min-w-max pb-6">
            {board.columns
              .sort((a, b) => a.order - b.order)
              .map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={getColumnCards(column.id)}
                  onAddCard={handleAddCard}
                  onDeleteCard={handleDeleteCard}
                  onEditCard={(card) => {
                    setEditingCard(card);
                    setGeneratedPrompt(null);
                  }}
                  onDeleteColumn={handleDeleteColumn}
                  onGeneratePrompt={handleGeneratePrompt}
                  generatingCardId={generatingCardId}
                />
              ))}

            {/* Add column placeholder */}
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(30, 41, 59, 0.8)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsAddColumnOpen(true)}
              className="flex flex-col items-center justify-center w-80 min-w-80 min-h-[300px]
                bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-600
                text-slate-400 hover:text-slate-300 hover:border-slate-500 transition-all"
            >
              <Plus className="w-10 h-10 mb-2" />
              <span className="font-medium">Add Column</span>
            </motion.button>
          </div>

          <DragOverlay>
            {activeCard && (
              <div className="opacity-90 rotate-3 scale-105">
                <KanbanCard
                  card={activeCard}
                  onDelete={() => {}}
                  onEdit={() => {}}
                  onGeneratePrompt={() => {}}
                  isGenerating={false}
                  columnColor={
                    board.columns.find((c) => c.id === activeCard.columnId)?.color || '#6366f1'
                  }
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </main>

      {/* Modals */}
      <CardModal
        card={editingCard}
        onClose={() => {
          setEditingCard(null);
          setGeneratedPrompt(null);
        }}
        onSave={handleUpdateCard}
        onGeneratePrompt={handleGeneratePrompt}
        isGenerating={generatingCardId === editingCard?.id}
        generatedPrompt={generatedPrompt}
      />

      <AddColumnModal
        isOpen={isAddColumnOpen}
        onClose={() => setIsAddColumnOpen(false)}
        onAdd={handleAddColumn}
      />

      <ApiKeyModal
        isOpen={isApiKeyOpen}
        onClose={() => setIsApiKeyOpen(false)}
        onSave={setApiKey}
        currentKey={apiKey}
      />
    </div>
  );
}
