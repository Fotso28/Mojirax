'use client';

export function OnlineBadge({ isOnline }: { isOnline: boolean }) {
  if (!isOnline) return null;
  return (
    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
  );
}
