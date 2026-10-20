export default function StampGrid({ stamps = 0, required = 10 }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: required }, (_, i) => (
        <div
          key={i}
          className={`flex aspect-square items-center justify-center rounded-full text-xs font-bold ${
            i < stamps ? "bg-purple text-white" : "bg-raised text-muted"
          }`}
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
}
