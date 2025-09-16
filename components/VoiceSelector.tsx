import React from 'react';
import { Gender } from '../types';

interface VoiceSelectorProps {
  selectedGender: Gender | null;
  onGenderChange: (gender: Gender) => void;
  isDetecting: boolean;
  error: string | null;
  disabled: boolean;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedGender, onGenderChange, isDetecting, error, disabled }) => {
  return (
    <div className="flex flex-col">
      <label className="mb-2 font-semibold text-lg text-teal-300">
        2. Select Voice Gender
      </label>
      <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 space-y-3">
        <p className="text-sm text-gray-400">
            This helps the AI create more suitable facial expressions. The final video will be silent.
        </p>
        <div className="flex items-center gap-4">
          <label className={`flex items-center space-x-2 cursor-pointer p-2 rounded-md transition-colors ${selectedGender === Gender.MALE ? 'bg-teal-600' : 'bg-gray-600 hover:bg-gray-500'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input
              type="radio"
              name="gender"
              value={Gender.MALE}
              checked={selectedGender === Gender.MALE}
              onChange={() => onGenderChange(Gender.MALE)}
              className="hidden"
              disabled={disabled}
            />
            <span className="font-medium">Male</span>
          </label>
          <label className={`flex items-center space-x-2 cursor-pointer p-2 rounded-md transition-colors ${selectedGender === Gender.FEMALE ? 'bg-teal-600' : 'bg-gray-600 hover:bg-gray-500'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input
              type="radio"
              name="gender"
              value={Gender.FEMALE}
              checked={selectedGender === Gender.FEMALE}
              onChange={() => onGenderChange(Gender.FEMALE)}
              className="hidden"
              disabled={disabled}
            />
            <span className="font-medium">Female</span>
          </label>
          {isDetecting && (
             <div className="flex items-center space-x-2 text-gray-400">
                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-300"></div>
                 <span>Detecting...</span>
            </div>
          )}
        </div>
         {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  );
};
