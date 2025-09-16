
import React, { useCallback } from 'react';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  previewUrl: string | null;
  disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, previewUrl, disabled }) => {
  const onDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onFileChange(file);
      } else {
        alert('Please drop an image file.');
      }
    }
  }, [onFileChange, disabled]);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileChange(files[0]);
    } else {
        onFileChange(null);
    }
  };

  return (
    <div className="flex flex-col">
      <label className="mb-2 font-semibold text-lg text-teal-300">1. Upload Your Image</label>
      <label
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center w-full h-full min-h-[200px] border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ${
          disabled ? 'cursor-not-allowed bg-gray-800' : 'border-gray-600 bg-gray-700 hover:bg-gray-600 hover:border-teal-500'
        }`}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className="object-contain h-full max-h-64 w-full rounded-lg" />
        ) : (
          <div className="text-center text-gray-400 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="mt-2 font-semibold">Drag & drop an image</p>
            <p className="text-sm">or click to browse</p>
          </div>
        )}
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={onFileSelect}
          accept="image/png, image/jpeg, image/webp"
          disabled={disabled}
        />
      </label>
    </div>
  );
};
