import React from 'react';
import { GenerationJob, Status, Gender } from '../types';
import { VideoPlayer } from './VideoPlayer';
import { Loader } from './Loader';

interface GenerationCardProps {
  job: GenerationJob;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  onDownload: (job: GenerationJob) => void;
  onRetry: (job: GenerationJob) => void;
}

export const GenerationCard: React.FC<GenerationCardProps> = ({ job, onCancel, onDelete, onDownload, onRetry }) => {
  const renderContent = () => {
    switch (job.status) {
      case Status.LOADING:
        return <Loader message={job.progressMessage} />;
      case Status.SUCCESS:
        return job.videoUrl ? <VideoPlayer src={job.videoUrl} /> : <Loader message="Preparing video..." />;
      case Status.ERROR:
        return (
          <div className="text-center p-4 bg-red-900/50 border border-red-700 rounded-lg h-full flex flex-col justify-center">
            <p className="font-bold text-red-400">Error</p>
            <p className="text-red-300 text-sm break-words">{job.error}</p>
          </div>
        );
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
              Retry
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
        <div className="min-h-[200px] flex items-center justify-center">
            {renderContent()}
        </div>
        <div className="mt-4">
            {renderActions()}
        </div>
      </div>
    </div>
  );
};
