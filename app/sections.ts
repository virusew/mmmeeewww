export const SECTIONS = [
  {
    id: 'study',
    label: 'Учёба',
    emoji: '📚',
    description: 'Пары, домашка, экзамены, преподá',
    color: 'from-blue-500/20 to-blue-600/5',
    border: 'border-blue-500/30',
    accent: 'text-blue-400',
  },
  {
    id: 'party',
    label: 'Тусовки',
    emoji: '🎉',
    description: 'Встречи, движ, куда сходить',
    color: 'from-purple-500/20 to-purple-600/5',
    border: 'border-purple-500/30',
    accent: 'text-purple-400',
  },
  {
    id: 'love',
    label: 'Любовь',
    emoji: '❤️',
    description: 'Симпатии, отношения, разбитые сердца',
    color: 'from-pink-500/20 to-pink-600/5',
    border: 'border-pink-500/30',
    accent: 'text-pink-400',
  },
  {
    id: 'complaint',
    label: 'Жалобы',
    emoji: '😤',
    description: 'Что бесит, на что жалуешься',
    color: 'from-orange-500/20 to-orange-600/5',
    border: 'border-orange-500/30',
    accent: 'text-orange-400',
  },
  {
    id: 'idea',
    label: 'Идеи',
    emoji: '💡',
    description: 'Предложения, что улучшить',
    color: 'from-yellow-500/20 to-yellow-600/5',
    border: 'border-yellow-500/30',
    accent: 'text-yellow-400',
  },
  {
    id: 'other',
    label: 'Другое',
    emoji: '💬',
    description: 'Всё, что не подошло к другим разделам',
    color: 'from-neutral-500/20 to-neutral-600/5',
    border: 'border-neutral-500/30',
    accent: 'text-neutral-400',
  },
];

export function getSection(id: string | null | undefined) {
  return SECTIONS.find((s) => s.id === id) || SECTIONS[SECTIONS.length - 1];
}