"use client"
import React, { useState, useRef } from 'react';
import { useMicrophonePermission } from './providers/microphonePermissionState';

interface AudioRecorderProps {
  onRecordingComplete?: (audioBlob: Blob, audioUrl: string) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete }) => {

  const { permission } = useMicrophonePermission();
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  const startRecording = async (): Promise<void> => {
    if (permission === "denied") {
      alert("Please allow permission to use the microphone.")
      return
    }
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });

        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        console.log("AUDIO BLOB : ", audioBlob);
        setAudioBlob(audioBlob)
        if (onRecordingComplete) {
          onRecordingComplete(audioBlob, url);

        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = (): void => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop all tracks in the stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  // Client-side code to send audio file with FormData using fetch

  const sendAudioToAPI = async (audioBlob: Blob, languageCode: string = 'en-US'): Promise<unknown> => {
    try {
      // Create a new FormData instance
      const formData = new FormData();

      // Append the audio blob with filename
      formData.append('audio', audioBlob, 'recording.wav');

      // Add additional parameters
      formData.append('languageCode', languageCode);

      // Send the request
      const response = await fetch('/api/audio', {
        method: 'POST',
        body: formData,
        // No need to set Content-Type header, fetch sets it automatically with boundary
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending audio:', error);
      throw error;
    }
  };

  // Usage example
  const handleAudioUpload = async (audioBlob: Blob) => {
    try {
      const result = await sendAudioToAPI(audioBlob, 'en-US');
      console.log('Transcription:', result);
      return result;
    } catch (error) {
      console.error('Failed to transcribe audio:', error);
    }
  };

  // useEffect(
  //   () => {
  //     fetch(new Request("/api/audio")).then(
  //       (resp) => {
  //         console.log("Endpoint hit success : ", resp)
  //       },
  //       (err) => {
  //         console.log("Endpoint error : ", err)
  //       }
  //     )
  //   },
  //   []
  // )

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow">
      <div className="w-full mb-4">
        <h1 className='text-black m-auto w-fit '>Microphone Permission State : {permission} </h1>
        <div className="flex justify-center space-x-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
              type="button"
            >
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
              type="button"
            >
              Stop Recording
            </button>
          )}
        </div>
      </div>

      {audioURL && (
        <div className="w-full mt-4">
          <h3 className="text-lg font-medium mb-2">Recorded Audio:</h3>
          <audio controls src={audioURL} className="w-full" />
          <button
            onClick={() => {
              if (audioBlob) {
                handleAudioUpload(audioBlob).then((success) => {
                  console.log("POSTED SUCCESS : ", success);
                },
                  (error) => {
                    console.log("POSTED ERROR : ", error)
                  }
                )
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
            type="button"
          >
            Post Audio
          </button>
        </div>

      )}
    </div>
  );
};

export default AudioRecorder;