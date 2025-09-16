import React from 'react';

export const Header: React.FC = () => (
  <header className="w-full max-w-4xl mx-auto text-center mb-8 md:mb-12">
    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-500">
      AI Lip Sync Animator
    </h1>
    <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">
      Upload a photo, provide an audio recording, and watch it come to life.
    </p>
  </header>
);