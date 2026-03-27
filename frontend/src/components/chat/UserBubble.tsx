interface Props {
  message: string;
}

export default function UserBubble({ message }: Props) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-tr-none overflow-hidden user-bubble-container">
        <div className="p-4 text-white font-medium leading-relaxed bg-black/10 text-sm">
          {message}
        </div>
      </div>
    </div>
  );
}
