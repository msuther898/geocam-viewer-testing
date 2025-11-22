'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Sparkles, Copy, Check } from 'lucide-react';
import { Card } from '@/types';

interface CardModalProps {
  card: Card | null;
  onClose: () => void;
  onSave: (card: Card) => void;
  onGeneratePrompt: (card: Card) => void;
  isGenerating: boolean;
  generatedPrompt: string | null;
}

export default function CardModal({
  card,
  onClose,
  onSave,
  onGeneratePrompt,
  isGenerating,
  generatedPrompt,
}: CardModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description);
      setNotes(card.notes);
    }
  }, [card]);

  const handleSave = () => {
    if (card && title.trim()) {
      onSave({
        ...card,
        title: title.trim(),
        description: description.trim(),
        notes: notes.trim(),
      });
      onClose();
    }
  };

  const handleCopyPrompt = async () => {
    if (generatedPrompt) {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!card) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-700"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold text-slate-100">Edit Card</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl
                  text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2
                  focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Card title..."
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl
                  text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2
                  focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                placeholder="Add a description..."
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl
                  text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2
                  focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                placeholder="Add notes, implementation details, etc..."
              />
            </div>

            {/* AI Prompt Section */}
            <div className="p-4 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 rounded-xl border border-indigo-700/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Prompt Generator
                </h3>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onGeneratePrompt(card)}
                  disabled={isGenerating}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500
                    text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50
                    ${isGenerating ? 'ai-glow animate-pulse' : ''}`}
                >
                  <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? 'Generating...' : 'Generate Prompt'}
                </motion.button>
              </div>

              {generatedPrompt && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative"
                >
                  <div className="bg-slate-900/80 rounded-lg p-4 text-sm text-slate-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {generatedPrompt}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCopyPrompt}
                    className="absolute top-2 right-2 p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </motion.button>
                </motion.div>
              )}

              {!generatedPrompt && !isGenerating && (
                <p className="text-sm text-slate-400">
                  Click &quot;Generate Prompt&quot; to create a Claude Code prompt based on this card&apos;s title and description.
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-slate-100 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
