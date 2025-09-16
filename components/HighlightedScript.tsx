import React from 'react';

interface HighlightedScriptProps {
    script: string;
    words: string[];
}

export const HighlightedScript: React.FC<HighlightedScriptProps> = ({ script, words }) => {
    if (!words || words.length === 0) {
        return <>{script}</>;
    }
    
    // Escape special regex characters in words and join them with '|' for the regex
    const escapedWords = words.map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi');
    const parts = script.split(regex);

    return (
        <>
            {parts.map((part, index) => {
                 // Check if the part is one of the words to highlight (case-insensitive)
                const isMatch = words.some(word => part.toLowerCase() === word.toLowerCase());
                if (isMatch) {
                    return (
                        <span key={index} className="bg-red-600 text-white rounded px-1">
                            {part}
                        </span>
                    );
                }
                return part;
            })}
        </>
    );
};
