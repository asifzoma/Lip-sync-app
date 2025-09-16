import React from 'react';
import { GenerationJob, Status, Gender } from '../types';
import { VideoPlayer } from './VideoPlayer';
import { Loader } from './Loader';
import { HighlightedScript } from './HighlightedScript';

interface GenerationCardProps {
  job: GenerationJob;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  onDownload: (job: GenerationJob) => void;
  onRetry: (job: GenerationJob) => void;
}

const getErrorInfo = (errorMessage: string = "An unknown error occurred.") => {
    const lowerCaseError = errorMessage.toLowerCase();

    const cleanMessage = errorMessage.startsWith('Generation failed: ')
      ? errorMessage.substring('Generation failed: '.length)
      : errorMessage;

    if (lowerCaseError.includes('policy') || lowerCaseError.includes('problematic words')) {
        return {
            title: 'Policy Violation',
            message: cleanMessage,
        };
    }
    if (lowerCaseError.includes('api key')) {
        return {
            title: 'Configuration Error',
            message: cleanMessage,
        };
    }
    if (lowerCaseError.includes('quota')) {
        return {
            title: 'Quota Exceeded',
            message: cleanMessage,
        };
    }
     if (lowerCaseError.includes('timed out')) {
        return {
            title: 'Request Timed Out',
            message: cleanMessage,
        };
    }
    return {
        title: 'Generation Error',
        message: errorMessage,
    };
};


export const GenerationCard: React.FC<GenerationCardProps> = ({ job, onCancel, onDelete, onDownload, onRetry }) => {
  const renderContent = () => {
    switch (job.status) {
      case Status.LOADING:
        return <Loader message={job.progressMessage} />;
      case Status.SUCCESS:
        return job.videoUrl ? <VideoPlayer src={job.videoUrl} /> : <Loader message="Preparing video..." />;
      case Status.ERROR: {
        const { title, message } = getErrorInfo(job.error);
        return (
          <div className="text-center p-4 bg-red-900/50 border border-red-700 rounded-lg h-full flex flex-col justify-center">
            <p className="font-bold text-red-400">{title}</p>
            <p className="text-red-300 text-sm break-words mt-1">{message}</p>
          </div>
        );
      }
      case Status.CANCELLED:
        return (
          <div className="text-center p-4 bg-gray-700/50 border border-gray-600 rounded-lg h-full flex flex-col justify-center">
            <p className="font-bold text-yellow-400">Cancelled</p>
            <p className="text-gray-300 text-sm">This generation was cancelled.</p>
          </div>
        );
      default:
        return null;
    }
  };

  const renderActions = () => {
    switch (job.status) {
      case Status.LOADING:
        return (
          <button onClick={() => onCancel(job.id)} className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg transition-colors">
            Cancel
          </button>
        );
      case Status.SUCCESS:
        return (
          <div className="flex gap-2">
            <button onClick={() => onDownload(job)} className="flex-1 py-2 px-4 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg transition-colors">
              Download
            </button>
            <button onClick={() => onDelete(job.id)} className="flex-1 py-2 px-4 bg-red-800 hover:bg-red-700 text-white font-bold rounded-lg transition-colors">
              Delete
            </button>
          </div>
        );
      case Status.ERROR:
        return (
          <div className="flex gap-2">
            <button onClick={() => onRetry(job)} className="flex-1 py-2 px-4 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg transition-colors">
              Edit & Retry
            </button>
            <button onClick={() => onDelete(job.id)} className="flex-1 py-2 px-4 bg-red-800 hover:bg-red-700 text-white font-bold rounded-lg transition-colors">
              Delete
            </button>
          </div>
        );
      case Status.CANCELLED:
        return (
          <button onClick={() => onDelete(job.id)} className="w-full py-2 px-4 bg-red-800 hover:bg-red-700 text-white font-bold rounded-lg transition-colors">
            Delete
          </button>
        );
      default:
        return null;
    }
  };
  
  const genderBadgeColor = job.gender === Gender.MALE ? 'bg-blue-600' : 'bg-pink-600';
  const genderText = job.gender.charAt(0).toUpperCase() + job.gender.slice(1);

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 flex flex-col overflow-hidden">
      <div className="relative h-48 bg-black flex items-center justify-center">
         <img src={job.imagePreviewUrl} alt="Input image" className="object-contain h-full w-full" />
         <div className={`absolute top-2 right-2 text-xs font-bold text-white px-2 py-1 rounded-full ${genderBadgeColor}`}>
            {genderText} Voice
         </div>
      </div>
      <div className="p-4 flex-grow flex flex-col justify-between">
         <div className="mb-4">
            <p className="text-sm font-semibold text-gray-400 mb-1">Transcribed Script:</p>
            <div className="text-xs text-gray-300 bg-gray-900 p-2 rounded-md max-h-20 overflow-y-auto font-mono">
                 <HighlightedScript script={job.script || "Script will appear here after transcription..."} words={job.offendingWords || []} />
            </div>
         </div>
        <div className="min-h-[150px] flex items-center justify-center">
            {renderContent()}
        </div>
        <div className="mt-4">
            {renderActions()}
        </div>
      </div>
    </div>
  );
};