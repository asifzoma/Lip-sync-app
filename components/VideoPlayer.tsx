
import React, { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  src: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if(videoRef.current) {
            videoRef.current.load();
        }
    }, [src]);

  return (
    <div className="w-full max-w-xl mx-auto bg-black rounded-lg overflow-hidden shadow-2xl border border-gray-700">
      <video ref={videoRef} className="w-full" controls autoPlay loop muted>
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};
