import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: string;
}

const Logo: React.FC<any> = ({ className = '', size = 'md', variant = 'default', ...props }) => {
  const sizeClasses: any = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg'
  };

  return (
    <div 
      {...props}
      className={`bg-brand rounded-xl flex items-center justify-center text-white font-black ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      CP
    </div>
  );
};

export default Logo;
