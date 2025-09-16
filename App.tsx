import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { GenerationCard } from './components/GenerationCard';
import { startVideoGeneration, checkVideoGenerationStatus, downloadVideo, detectGenderFromImage } from './services/geminiService';
import { LOADING_MESSAGES } from './constants';
import { Gender, GenerationJob, Status } from './types';
import { Loader } from './components/Loader';
import { VoiceSelector } from './components/VoiceSelector';

const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [script, setScript] = useState<string>('');
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [isDetectingGender, setIsDetectingGender] = useState(false);
  const [genderError, setGenderError] = useState<string | null>(null);

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

  const createJob = async (image: File, scriptText: string, previewUrl: string, jobGender: Gender) => {
      const newJob: GenerationJob = {
        id: `${Date.now()}-${Math.random()}`,
        status: Status.LOADING,
        imageFile: image,
        imagePreviewUrl: previewUrl,
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
         setJobs(prevJobs => prevJobs.map(j => j.id === newJob.id ? {...j, status: Status.ERROR, error: errorMessage} : j));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile || !script || !imagePreviewUrl) {
      setError('Please provide both an image and a script.');
      return;
    }
    if (!gender) {
        setError('Please select a voice gender.');
        return;
    }
    setError(null);
    setIsSubmitting(true);

    await createJob(imageFile, script, imagePreviewUrl, gender);

    // Reset form
    handleImageChange(null);
    setScript('');
    setGender(null);
    const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
    if(fileInput) fileInput.value = "";

    setIsSubmitting(false);
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
    createJob(job.imageFile, job.script, job.imagePreviewUrl, job.gender);
    setJobs(jobs.filter(j => j.id !== job.id));
  };

  const isFormSubmittable = imageFile && script.trim().length > 0 && gender && !isSubmitting;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 md:p-8 font-sans">
      <Header />
      <main className="w-full max-w-6xl mx-auto flex-grow flex flex-col items-center">
        <div className="w-full max-w-4xl bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8 md:p-10 border border-gray-700 mb-12">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FileUpload
                  onFileChange={handleImageChange}
                  previewUrl={imagePreviewUrl}
                  disabled={isSubmitting}
                />
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
                        3. Enter Your Script
                      </label>
                      <textarea
                        id="script"
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        placeholder="Enter the words you want the image to speak..."
                        className="w-full h-full min-h-[200px] flex-grow bg-gray-700 border border-gray-600 rounded-lg p-4 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-200 text-gray-200 placeholder-gray-400 disabled:opacity-50"
                        rows={8}
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
                  <Loader message="" inline={true} />
                ) : (
                  <>
                    <svg xmlns="http://www.w.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>Generate Video</span>
                  </>
                )}
              </button>
            </form>
        </div>

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
