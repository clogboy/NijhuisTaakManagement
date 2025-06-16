import React from 'react';

interface LoadingAnimationProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingAnimation({ className = '', size = 'md' }: LoadingAnimationProps) {
  const sizeClasses = {
    sm: 'w-8 h-6',
    md: 'w-12 h-8',
    lg: 'w-16 h-12'
  };

  const barHeights = {
    sm: ['h-1', 'h-1.5', 'h-1'],
    md: ['h-1.5', 'h-2', 'h-1.5'],
    lg: ['h-2', 'h-3', 'h-2']
  };

  return (
    <div className={`flex flex-col justify-center items-center gap-1 ${sizeClasses[size]} ${className}`}>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`w-full ${barHeights[size][index]} bg-red-600 rounded-sm nijhuis-bar`}
          style={{
            animationDelay: `${index * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

export function DashboardLoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="mb-8">
        <LoadingAnimation size="lg" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-neutral-dark mb-2">
          NijFlow wordt geladen...
        </h2>
        <p className="text-neutral-medium">
          Even geduld, we bereiden uw dashboard voor
        </p>
      </div>
    </div>
  );
}