import React from 'react';

interface LoaderProps {
  message: string;
  inline?: boolean;
}

const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-300"></div>
);

export const Loader: React.FC<LoaderProps> = ({ message, inline = false }) => {
    if (inline) {
        return (
            <div className="flex items-center justify-center space-x-2">
                 <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                 <span>Processing...</span>
            </div>
        )
    }

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-4 text-center h-full">
      <Spinner />
      <p className="text-md text-teal-300 font-medium animate-pulse">{message}</p>
    </div>
  );
};
