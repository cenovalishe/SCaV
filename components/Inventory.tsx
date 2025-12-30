'use client'

import { useTransition } from 'react';
import { useItem } from '@/app/actions/inventoryActions';

const ITEM_ICONS: Record<string, string> = {
  "medkit": "❤️‍🩹", // Medkit
  "sedative": "💊", // Pills
  "flashlight": "🔦", // Flashlight
  "key_card": "💳", // Key
  "adrenaline": "💉" 
};

interface InventoryProps {
  items: string[];
  gameId: string;
  playerId: string;
}

export default function Inventory({ items, gameId, playerId }: InventoryProps) {
  const [isPending, startTransition] = useTransition();

  const handleUse = (item: string) => {
    startTransition(async () => {
      const res = await useItem(gameId, playerId, item);
      if (!res.success) alert(res.message);
    });
  };

  if (items.length === 0) {
    return <div className="text-gray-600 text-sm italic mt-2">Inventory empty</div>;
  }

  return (
    <div className="flex gap-2 mt-2 flex-wrap">
      {items.map((item, index) => (
        <button
          key={`${item}-${index}`}
          onClick={() => handleUse(item)}
          disabled={isPending}
          className="relative group bg-gray-800 border border-gray-600 p-2 rounded hover:bg-gray-700 active:scale-95 transition"
          title={`Click to use ${item}`}
        >
          <span className="text-2xl" role="img" aria-label={item}>
            {ITEM_ICONS[item] || "📦"}
          </span>
          
          {/* Tooltip */}
          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
            {item.toUpperCase()}
          </span>
        </button>
      ))}
    </div>
  );
}