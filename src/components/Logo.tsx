import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'dark';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', variant = 'default', ...props }) => {
  const sizeMap: Record<string, { container: string, svg: string, text: string, textOffset: string }> = {
    sm: { container: 'h-8', svg: 'w-10 h-10', text: 'text-[14px]', textOffset: '-ml-6' },
    md: { container: 'h-10', svg: 'w-14 h-14', text: 'text-[20px]', textOffset: '-ml-9' },
    lg: { container: 'h-16', svg: 'w-24 h-24', text: 'text-[36px]', textOffset: '-ml-15' },
    xl: { container: 'h-24', svg: 'w-36 h-36', text: 'text-[54px]', textOffset: '-ml-22' }
  };

  const current = sizeMap[size] || sizeMap.md;
  
  // Vibrant green from image
  const brandGreen = '#22C55E'; 
  // Dark slate for "Phone"
  const darkBlueClass = variant === 'white' ? 'text-white' : (variant === 'dark' ? 'text-slate-900' : 'text-slate-900 dark:text-white');

  const iconDashClass = variant === 'white' ? 'text-white' : (variant === 'dark' ? 'text-slate-900' : 'text-slate-900 dark:text-white');

  return (
    <div className={`flex items-center select-none ${current.container} ${className}`} {...props}>
      {/* Custom SVG Icon "C" */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg 
          viewBox="0 0 100 100" 
          className={current.svg}
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer thick C */}
          <path 
            d="M75 30C70 22 60 18 50 18C32 18 18 32 18 50C18 68 32 82 50 82C60 82 70 78 75 70" 
            stroke={brandGreen} 
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Interior detail */}
          <path 
            d="M32 50C32 40 40 32 50 32C60 32 68 40 68 50C68 60 60 68 50 68" 
            stroke={brandGreen} 
            strokeWidth="4"
            opacity="0.3"
          />
          {/* Dashed outer detail on the left */}
          <path 
            d="M20 38C18 42 17 46 17 50C17 54 18 58 20 62" 
            stroke="currentColor" 
            className={iconDashClass}
            strokeWidth="3" 
            strokeDasharray="2 4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Typography */}
      <div className={`font-black flex items-center ${current.textOffset} ${current.text}`} style={{ letterSpacing: '-0.02em', fontFamily: 'Inter, sans-serif' }}>
        <span style={{ color: brandGreen }}>CyBer</span>
        <span className={darkBlueClass}>Phone</span>
      </div>
    </div>
  );
};

export default Logo;
