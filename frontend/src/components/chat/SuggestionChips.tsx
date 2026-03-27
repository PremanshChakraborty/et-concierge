interface Props {
  questions: string[];
  onSelect: (q: string) => void;
}

export default function SuggestionChips({ questions, onSelect }: Props) {
  if (!questions.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {questions.map((q) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          className="text-xs font-medium px-3 py-1.5 rounded-full border border-border-light bg-white hover:bg-surface-light hover:border-black/20 transition-colors text-black/70"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
