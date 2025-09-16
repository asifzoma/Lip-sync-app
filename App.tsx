import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { AudioUpload } from './components/AudioUpload';
import { GenerationCard } from './components/GenerationCard';
import { startVideoGeneration, checkVideoGenerationStatus, downloadVideo, detectGenderFromImage, transcribeAudio } from './services/geminiService';
import { LOADING_MESSAGES } from './constants';
import { Gender, GenerationJob, Status } from './types';
import { Loader } from './components/Loader';
import { VoiceSelector } from './components/VoiceSelector';
import { ScriptEditorModal } from './components/ScriptEditorModal';

interface JobDataForModal {
    imageFile: File;
    imagePreviewUrl: string;
    audioFile: File;
    gender: Gender;
    script: string;
    offendingWords?: string[];
    isRetryOf?: string; // ID of the job being retried
}

const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [isDetectingGender, setIsDetectingGender] = useState(false);
  const [genderError, setGenderError] = useState<string | null>(null);
  const [jobDataForModal, setJobDataForModal] = useState<JobDataForModal | null>(null);


  // Polling effect to check on loading jobs
  useEffect(() => {
    const interval = setInterval(() => {
      jobs.forEach(job => {
        if (job.status === Status.LOADING && job.operation) {
          checkVideoGenerationStatus(job.operation)
            .then(updatedOperation => {
              // Update progress message randomly to show activity
              setJobs(prevJobs => prevJobs.map(j =>
                j.id === job.id ? { ...j, operation: updatedOperation, progressMessage: LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)] } : j
              ));

              if (updatedOperation.done) {
                const downloadLink = updatedOperation.response?.generatedVideos?.[0]?.video?.uri;
                if (downloadLink) {
                  downloadVideo(downloadLink)
                    .then(videoUrl => {
                      setJobs(prevJobs => prevJobs.map(j =>
                        j.id === job.id ? { ...j, status: Status.SUCCESS, videoUrl: videoUrl, operation: undefined } : j
                      ));
                    })
                    .catch(err => {
                       setJobs(prevJobs => prevJobs.map(j =>
                        j.id === job.id ? { ...j, status: Status.ERROR, error: err.message, operation: undefined } : j
                      ));
                    });
                } else {
                  const errorMessage = updatedOperation.error?.message || "Generation finished but no video was returned.";
                  setJobs(prevJobs => prevJobs.map(j =>
                    j.id === job.id ? { ...j, status: Status.ERROR, error: errorMessage, operation: undefined } : j
                  ));
                }
              }
            })
            .catch(err => {
              console.error("Polling failed for job", job.id, err);
              setJobs(prevJobs => prevJobs.map(j =>
                j.id === job.id ? { ...j, status: Status.ERROR, error: err.message, operation: undefined } : j
              ));
            });
        }
      });
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [jobs]);

  const handleImageChange = async (file: File | null) => {
    setImageFile(file);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    const newPreviewUrl = file ? URL.createObjectURL(file) : null;
    setImagePreviewUrl(newPreviewUrl);

    setGender(null);
    setGenderError(null);

    if (file) {
      setIsDetectingGender(true);
      try {
        const detectedGender = await detectGenderFromImage(file);
        setGender(detectedGender as Gender);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Could not detect gender.";
        setGenderError(errorMessage);
        setGender(Gender.MALE); // Default on failure
      } finally {
        setIsDetectingGender(false);
      }
    }
  };
  
  const handleAudioChange = (file: File | null) => {
    setAudioFile(file);
  };

  const createJob = async (image: File, audio: File, scriptText: string, previewUrl: string, jobGender: Gender, isRetryOf?: string) => {
      if (isRetryOf) {
        setJobs(jobs => jobs.filter(j => j.id !== isRetryOf));
      }

      const newJob: GenerationJob = {
        id: `${Date.now()}-${Math.random()}`,
        status: Status.LOADING,
        imageFile: image,
        imagePreviewUrl: previewUrl,
        audioFile: audio,
        script: scriptText,
        gender: jobGender,
        progressMessage: "Starting generation...",
      };

      setJobs(prevJobs => [newJob, ...prevJobs]);

      try {
        const operation = await startVideoGeneration(image, scriptText, jobGender);
        setJobs(prevJobs => prevJobs.map(j => j.id === newJob.id ? {...j, operation, progressMessage: "Generation in progress..."} : j));
      } catch (err) {
         const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
         let offendingWords: string[] = [];
         let finalErrorMessage = errorMessage;

         if (errorMessage.startsWith('SAFETY_VIOLATION::')) {
            try {
                offendingWords = JSON.parse(errorMessage.substring('SAFETY_VIOLATION::'.length));
                finalErrorMessage = `The script was blocked by safety policies. Potentially problematic words: ${offendingWords.join(', ')}`;
            } catch (e) {
                finalErrorMessage = 'The script was blocked by safety policies, but could not identify specific words.';
            }
         }
         
         setJobs(prevJobs => prevJobs.map(j => j.id === newJob.id ? {...j, status: Status.ERROR, error: finalErrorMessage, offendingWords} : j));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile || !audioFile || !imagePreviewUrl) {
      setError('Please provide both an image and an audio file.');
      return;
    }
    if (!gender) {
        setError('Please select a voice gender.');
        return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
        const transcribedScript = await transcribeAudio(audioFile);
        if (!transcribedScript) {
            throw new Error("Transcription failed or returned empty. Please check the audio file.");
        }
        
        setJobDataForModal({
            imageFile,
            imagePreviewUrl,
            audioFile,
            gender,
            script: transcribedScript
        });
        
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during submission.";
        setError(errorMessage);
    }


    setIsSubmitting(false);
  };
  
  const handleConfirmGeneration = (editedScript: string) => {
    if (!jobDataForModal) return;

    const { imageFile, audioFile, script, imagePreviewUrl, gender, isRetryOf } = jobDataForModal;
    
    const scriptToUse = editedScript || script;

    createJob(imageFile, audioFile, scriptToUse, imagePreviewUrl, gender, isRetryOf);
    
    setJobDataForModal(null);
    handleImageChange(null);
    handleAudioChange(null);
    setGender(null);
    const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
    if(fileInput) fileInput.value = "";
    const audioInput = document.getElementById('audio-upload-input') as HTMLInputElement;
    if(audioInput) audioInput.value = "";
};

  const handleCancelGeneration = () => {
    setJobDataForModal(null);
  };

  const handleCancel = (id: string) => {
    setJobs(jobs.map(job => job.id === id ? { ...job, status: Status.CANCELLED, operation: undefined } : job));
  };

  const handleDelete = (id: string) => {
    const jobToDelete = jobs.find(j => j.id === id);
    if (jobToDelete) {
      if (jobToDelete.imagePreviewUrl) URL.revokeObjectURL(jobToDelete.imagePreviewUrl);
      if (jobToDelete.videoUrl) URL.revokeObjectURL(jobToDelete.videoUrl);
    }
    setJobs(jobs.filter(job => job.id !== id));
  };

  const handleDownload = (job: GenerationJob) => {
    if(!job.videoUrl) return;
    const a = document.createElement('a');
    a.href = job.videoUrl;
    a.download = `lipsync_video_${job.id}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRetry = (job: GenerationJob) => {
    setJobDataForModal({
        imageFile: job.imageFile,
        imagePreviewUrl: job.imagePreviewUrl,
        audioFile: job.audioFile,
        gender: job.gender,
        script: job.script,
        offendingWords: job.offendingWords,
        isRetryOf: job.id,
    });
  };

  const isFormSubmittable = imageFile && audioFile && gender && !isSubmitting;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 md:p-8 font-sans">
      <Header />
      <main className="w-full max-w-6xl mx-auto flex-grow flex flex-col items-center">
        <div className="w-full max-w-4xl bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8 md:p-10 border border-gray-700 mb-12">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col">
                    <label className="mb-2 font-semibold text-lg text-teal-300">1. Provide Your Image</label>
                    <div className="relative w-full h-64 bg-gray-700 rounded-lg overflow-hidden border border-gray-600 mb-4 flex items-center justify-center">
                        {imagePreviewUrl ? (
                            <img src={imagePreviewUrl} alt="Preview" className="object-contain h-full w-full" />
                        ) : (
                            <div className="text-center text-gray-400 p-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                <p className="mt-2 font-semibold">Image Preview</p>
                                <p className="text-sm">Your image will appear here.</p>
                            </div>
                        )}
                    </div>
                    <FileUpload
                        onFileChange={handleImageChange}
                        disabled={isSubmitting}
                    />
                </div>
                <div className="flex flex-col space-y-8">
                    <VoiceSelector
                        selectedGender={gender}
                        onGenderChange={(g) => setGender(g)}
                        isDetecting={isDetectingGender}
                        error={genderError}
                        disabled={isSubmitting || !imageFile}
                    />
                    <div className="flex flex-col flex-grow">
                      <label htmlFor="script" className="mb-2 font-semibold text-lg text-teal-300">
                        3. Upload Your Audio
                      </label>
                      <AudioUpload
                        onFileChange={handleAudioChange}
                        disabled={isSubmitting}
                      />
                    </div>
                </div>
              </div>
              {error && <p className="text-red-400 text-center">{error}</p>}
              <button
                type="submit"
                disabled={!isFormSubmittable}
                className="w-full py-3 px-6 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold text-lg rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <Loader message="Transcribing..." inline={true} />
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>Generate Video</span>
                  </>
                )}
              </button>
            </form>
        </div>

        {jobDataForModal && (
            <ScriptEditorModal
                jobData={jobDataForModal}
                onConfirm={handleConfirmGeneration}
                onCancel={handleCancelGeneration}
            />
        )}

        {jobs.length > 0 && (
          <div className="w-full">
            <h2 className="text-3xl font-bold text-center mb-8 text-teal-300">My Generations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {jobs.map(job => (
                <GenerationCard
                  key={job.id}
                  job={job}
                  onCancel={handleCancel}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                  onRetry={handleRetry}
                />
              ))}
            </div>
          </div>
        )}

        <footer className="w-full text-center py-6 mt-8 text-gray-500">
            <p>Powered by Gemini. Create, Animate, and Inspire.</p>
        </footer>
      </main>
    </div>
  );
};

export default App;