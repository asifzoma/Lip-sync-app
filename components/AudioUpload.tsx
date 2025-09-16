import React, { useCallback, useState, useEffect } from 'react';

interface AudioUploadProps {
  onFileChange: (file: File | null) => void;
  disabled: boolean;
}

export const AudioUpload: React.FC<AudioUploadProps> = ({ onFileChange, disabled }) => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // Cleanup object URL on component unmount
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFile = (file: File | null) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      onFileChange(file);
    } else {
      if (file) alert('Please select an audio file.');
      setAudioFile(null);
      onFileChange(null);
    }
  }

  const onDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled]);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    } else {
      handleFile(null);
    }
  };
  
  const handleRemove = () => {
      handleFile(null);
      // Reset the file input visually
      const input = document.getElementById('audio-upload-input') as HTMLInputElement;
      if (input) input.value = "";
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-700/50 border-2 border-dashed border-gray-600 rounded-lg p-4">
      {audioFile && previewUrl ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-gray-200 truncate pr-2" title={audioFile.name}>
                {audioFile.name}
            </p>
             <button
                type="button"
                onClick={handleRemove}
                className="text-gray-400 hover:text-white transition-colors text-sm font-bold"
                aria-label="Remove audio file"
                disabled={disabled}
            >
                &times;
            </button>
          </div>
          <audio src={previewUrl} controls className="w-full h-10" />
        </div>
      ) : (
        <label
          onDragOver={onDragOver}
          onDrop={onDrop}
          className={`relative flex flex-col items-center justify-center w-full h-full min-h-[150px] cursor-pointer transition-colors duration-200 ${
            disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-600/50 hover:border-teal-500'
          }`}
        >
          <div className="text-center text-gray-400 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 6l12-3" /></svg>
            <p className="mt-2 font-semibold">Drag & drop an audio file</p>
            <p className="text-sm">or click to browse</p>
          </div>
          <input
            id="audio-upload-input"
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={onFileSelect}
            accept="audio/*"
            disabled={disabled}
          />
        </label>
      )}
    </div>
  );
};