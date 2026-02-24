import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Optional text to display
   */
  text?: string;
  /**
   * Whether to take up full screen height
   */
  fullScreen?: boolean;
  /**
   * Custom class name
   */
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

/**
 * Reusable loading spinner component
 */
export function LoadingSpinner({ 
  size = 'md', 
  text, 
  fullScreen = false,
  className = '' 
}: LoadingSpinnerProps) {
  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 className={`animate-spin text-blue-600 ${sizeClasses[size]}`} />
      {text && <p className="text-gray-600 text-sm">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}

export default LoadingSpinner;
