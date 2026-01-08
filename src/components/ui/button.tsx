// Mock Button Component
import React from 'react';

export const Button = ({ children, onClick, className, variant = 'primary', ...props }: any) => {
  return (
    <button 
      onClick={onClick} 
      className={`px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
