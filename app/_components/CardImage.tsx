"use client";

interface CardImageProps {
  name: string;
  evolutionLevel?: number; // 0 = Normal, 1 = Evo, 2 = Hero
  cardImages: Record<string, string>;
  className?: string;
  withRing?: boolean; // New prop to toggle visual borders
}

export default function CardImage({ 
  name, 
  evolutionLevel = 0, 
  cardImages, 
  className = "",
  withRing = false
}: CardImageProps) {
  const isHero = evolutionLevel === 2;
  const isEvo = evolutionLevel === 1;

  // Resolve Image Source
  const getSource = () => {
    if (isHero) {
      const cleanName = name.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '');
      return `/heroes/${cleanName}.png`;
    }
    
    if (isEvo) {
      const evoKey = `${name} (Evo)`;
      if (cardImages[evoKey]) return cardImages[evoKey];
    }

    return cardImages[name] || "";
  };

  // Determine Ring Styles
  const getRingClasses = () => {
    if (!withRing) return "";
    
    if (isHero) {
      return "ring-1 ring-amber-500/50 shadow-[0_0_4px_rgba(245,158,11,0.4)]";
    }
    
    if (isEvo) {
      return "ring-1 ring-purple-500/50 shadow-[0_0_4px_rgba(168,85,247,0.4)]";
    }
    
    return "ring-1 ring-gray-700"; // Subtle ring for standard cards
  };

  const ringClasses = getRingClasses();

  return (
    <div className={`relative ${ringClasses} ${className} rounded-sm`}>
      <img
        src={getSource()}
        alt={name}
        className="w-full h-full object-contain drop-shadow-sm rounded-sm"
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.opacity = "0.3";
        }}
      />
    </div>
  );
}