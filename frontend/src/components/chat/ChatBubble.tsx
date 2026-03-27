interface Props {
  text: string;
}

export default function ChatBubble({ text }: Props) {
  return (
    <div className="bg-surface-light text-black p-4 rounded-2xl rounded-tl-none border border-border-light leading-relaxed text-sm">
      {text}
    </div>
  );
}
