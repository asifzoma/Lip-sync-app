import React, { useState } from 'react';
import { HighlightedScript } from './HighlightedScript';

interface JobDataForModal {
    script: string;
    offendingWords?: string[];
}

interface ScriptEditorModalProps {
    jobData: JobDataForModal;
    onConfirm: (newScript: string) => void;
    onCancel: () => void;
}

export const ScriptEditorModal: React.FC<ScriptEditorModalProps> = ({ jobData, onConfirm, onCancel }) => {
    const [editedScript, setEditedScript] = useState(jobData.script);

    const handleConfirm = () => {
        onConfirm(editedScript);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl border border-gray-700 transform transition-all">
                <h2 className="text-2xl font-bold mb-4 text-teal-300">Review & Edit Script</h2>
                {jobData.offendingWords && jobData.offendingWords.length > 0 ? (
                    <div className="mb-4">
                        <p className="text-yellow-400 mb-2 font-semibold">We've highlighted some words that may have caused an issue. Please review and edit the script below.</p>
                        <div className="text-sm text-gray-300 bg-gray-900 p-3 rounded-md font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                            <HighlightedScript script={jobData.script} words={jobData.offendingWords} />
                        </div>
                    </div>
                ) : (
                     <p className="text-gray-400 mb-4">This is the script transcribed from your audio. You can make changes below before generating the video.</p>
                )}

                <textarea
                    value={editedScript}
                    onChange={(e) => setEditedScript(e.target.value)}
                    className="w-full h-48 p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200 font-mono text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                    aria-label="Script editor"
                />

                <div className="mt-6 flex justify-end space-x-4">
                    <button
                        onClick={onCancel}
                        className="py-2 px-6 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg shadow-lg transition-all duration-300"
                    >
                        Cancel
                    </button>
                     <button
                        onClick={handleConfirm}
                        className="py-2 px-6 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg shadow-lg transition-all duration-300"
                    >
                        Confirm & Animate
                    </button>
                </div>
            </div>
        </div>
    );
};
