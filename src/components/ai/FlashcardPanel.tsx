import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Layers,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  RotateCw,
  Copy,
  LayoutGrid,
} from 'lucide-react'
import { generateFlashcards } from '@/lib/server/functions/ai'
import { getMaterialContentForAi } from '@/lib/server/functions/materials'
import { MaterialPicker } from './MaterialPicker'
import type { PickedMaterial } from './MaterialPicker'

export function FlashcardPanel() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [selectedMaterial, setSelectedMaterial] = useState<PickedMaterial | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [viewMode, setViewMode] = useState<'deck' | 'grid'>('deck')

  const generateMutation = useMutation({
    mutationFn: async (material: PickedMaterial) => {
      const { title, content } = await getMaterialContentForAi({
        data: { materialId: material.id },
      })
      if (content.length < 50) {
        throw new Error(
          'Not enough content to generate flashcards. Please select a material with more content.',
        )
      }
      return generateFlashcards({
        data: { materialTitle: title, materialContent: content },
      })
    },
    onSuccess: () => {
      setCurrentIndex(0)
      setIsFlipped(false)
    },
  })

  const flashcards = generateMutation.data?.flashcards

  const nextCard = () => {
    if (!flashcards) return
    setIsFlipped(false)
    setTimeout(() => setCurrentIndex((prev) => (prev + 1) % flashcards.length), 150)
  }

  const prevCard = () => {
    if (!flashcards) return
    setIsFlipped(false)
    setTimeout(
      () => setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length),
      150,
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Layers className="text-classly-green" size={20} />
            Flashcard Generator
          </h3>

          {generateMutation.isError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-600 font-medium">
                {generateMutation.error.message}
              </p>
            </div>
          )}

          <MaterialPicker
            selectedSubjectId={selectedSubjectId}
            selectedMaterialId={selectedMaterial?.id ?? null}
            onSelectSubject={setSelectedSubjectId}
            onSelectMaterial={setSelectedMaterial}
            disabled={generateMutation.isPending}
          />

          <button
            onClick={() => selectedMaterial && generateMutation.mutate(selectedMaterial)}
            disabled={!selectedMaterial || generateMutation.isPending}
            className="w-full py-3.5 bg-classly-green text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Analyzing & Creating Cards...
              </>
            ) : (
              <>
                <Layers size={20} />
                Generate Flashcards
              </>
            )}
          </button>
        </div>
      </div>

      {flashcards && flashcards.length > 0 && selectedMaterial && (
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h4 className="font-semibold text-gray-900">{selectedMaterial.title}</h4>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('deck')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'deck'
                    ? 'bg-white shadow-xs text-classly-green'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Deck View"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-xs text-classly-green'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Grid View"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>

          {viewMode === 'deck' ? (
            <div className="max-w-4xl mx-auto">
              <div className="relative h-120 w-full perspective-[1000px] mb-6">
                <div
                  className={`relative w-full h-full transition-all duration-500 transform-3d cursor-pointer ${
                    isFlipped ? 'transform-[rotateY(180deg)]' : ''
                  }`}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div className="absolute inset-0 w-full h-full bg-white rounded-2xl border border-gray-200 shadow-sm backface-hidden flex flex-col items-center justify-center p-8 text-center hover:shadow-md transition-shadow">
                    <span className="absolute top-4 left-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Question
                    </span>
                    <span className="absolute top-4 right-4 text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                      {currentIndex + 1} / {flashcards.length}
                    </span>
                    <p className="text-xl font-medium text-gray-800 leading-relaxed">
                      {flashcards[currentIndex].question}
                    </p>
                    <p className="absolute bottom-6 text-sm text-gray-400 flex items-center gap-1.5">
                      <RotateCw size={14} /> Click to flip
                    </p>
                  </div>

                  <div className="absolute inset-0 w-full h-full bg-gray-50 rounded-2xl border border-classly-green/30 shadow-sm transform-[rotateY(180deg)] backface-hidden flex flex-col items-center justify-center p-8 text-center">
                    <span className="absolute top-4 left-4 text-xs font-semibold text-classly-green uppercase tracking-wider">
                      Answer
                    </span>
                    <p className="text-lg text-gray-800 leading-relaxed">
                      {flashcards[currentIndex].answer}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={prevCard}
                  className="p-3 rounded-full hover:bg-gray-100 text-gray-600 transition-colors border border-transparent hover:border-gray-200"
                >
                  <ChevronLeft size={24} />
                </button>

                <div className="w-full max-w-50 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-classly-green h-full transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
                  />
                </div>

                <button
                  onClick={nextCard}
                  className="p-3 rounded-full hover:bg-gray-100 text-gray-600 transition-colors border border-transparent hover:border-gray-200"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flashcards.map((card, idx) => (
                <div
                  key={idx}
                  className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <p className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                    Question {idx + 1}
                  </p>
                  <p className="font-medium text-gray-900 mb-4">{card.question}</p>
                  <hr className="border-gray-100 my-3" />
                  <p className="text-sm font-semibold text-classly-green mb-1 uppercase tracking-wider">
                    Answer
                  </p>
                  <p className="text-gray-700">{card.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}