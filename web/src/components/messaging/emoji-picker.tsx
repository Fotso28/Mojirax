'use client';

import dynamic from 'next/dynamic';
import data from '@emoji-mart/data';

const Picker = dynamic(() => import('@emoji-mart/react').then((mod) => mod.default), {
  ssr: false,
  loading: () => <div className="h-[350px] w-[350px] bg-gray-50 rounded-xl animate-pulse" />,
});

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  return (
    <Picker
      data={data}
      onEmojiSelect={(emoji: any) => onSelect(emoji.native)}
      theme="light"
      locale="fr"
      previewPosition="none"
      skinTonePosition="none"
      maxFrequentRows={2}
    />
  );
}
