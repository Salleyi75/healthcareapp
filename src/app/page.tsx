"use client"
import React, { useState, useRef } from 'react';
import { useMicrophonePermission } from './providers/microphonePermissionState';
import { Select, Title } from '@mantine/core';
import AudioCardElement from './component/AudioCardElement';



const popularLanguages = [
  { label: "English (United States)", value: "en-US" },
  { label: "English (United Kingdom)", value: "en-GB" },
  { label: "Spanish (Spain)", value: "es-ES" },
  { label: "Spanish (Mexico)", value: "es-MX" },
  { label: "French (France)", value: "fr-FR" },
  { label: "German (Germany)", value: "de-DE" },
  { label: "Chinese (Simplified, China)", value: "zh-CN" },
  { label: "Chinese (Traditional, Taiwan)", value: "zh-TW" },
  { label: "Japanese (Japan)", value: "ja-JP" },
  { label: "Korean (South Korea)", value: "ko-KR" },
  { label: "Arabic (Egypt)", value: "ar-EG" },
  { label: "Hindi (India)", value: "hi-IN" },
  { label: "Portuguese (Brazil)", value: "pt-BR" },
  { label: "Portuguese (Portugal)", value: "pt-PT" },
  { label: "Russian (Russia)", value: "ru-RU" },
  { label: "Italian (Italy)", value: "it-IT" },
  { label: "Dutch (Netherlands)", value: "nl-NL" },
  { label: "Turkish (Turkey)", value: "tr-TR" },
  { label: "Vietnamese (Vietnam)", value: "vi-VN" },
  { label: "Thai (Thailand)", value: "th-TH" },
];

const AudioRecorder: React.FC = () => {

  const { permission } = useMicrophonePermission();
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  // const [_, setAudioBlob] = useState<Blob | null>(null)

  const [isUploadingAudio, setIsUploadingAudio] = useState<boolean>(false)

  const [transcribedText, setTranscribedText] = useState<string | null>(null)
  const [translatedText, setTranslatedText] = useState<string | null>(null)
  const [translatedAudio, setTranslatedAudio] = useState<string | null>(null);

  const [inputLanguage, setInputLanguage] = useState<string>(popularLanguages[0].value)
  const [outputLanguage, setOutputLanguage] = useState<string>(popularLanguages[3].value)


  const startRecording = async (): Promise<void> => {
    if (permission === "denied") {
      alert("Please allow permission to use the microphone.")
      return
    }
    try {
      audioChunksRef.current = [];
      updateTheThreeStates(null, null, null)
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

        setIsUploadingAudio(true)
        handleAudioUpload(audioBlob)
          .finally(() => { setIsUploadingAudio(false) })
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

  const sendAudioToAPI = async (audioBlob: Blob, languageCode: string = 'en-US'): Promise<{ success: boolean, originalText: string, translatedText: string, audioContent: string, fullResponse: unknown } | void> => {
    try {
      // Create a new FormData instance
      const formData = new FormData();

      // Append the audio blob with filename
      formData.append('audio', audioBlob, 'recording.wav');

      // Add additional parameters
      formData.append('sourceLanguage', languageCode);

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
      // throw error;
    }
  };

  const updateTheThreeStates = (translatedAudio: string | null, translatedText: string | null, transcribedText: string | null) => {
    setTranslatedAudio(translatedAudio ? `${translatedAudio}` : null)
    setTranscribedText(transcribedText)
    setTranslatedText(translatedText)
  }

  // Usage example
  const handleAudioUpload = async (audioBlob: Blob) => {
    try {
      const result = await sendAudioToAPI(audioBlob, 'en-US');

      if (result?.success) {
        updateTheThreeStates(`data:audio/mp3;base64,${result.audioContent}`, result.translatedText, result.originalText)
      } else {
        alert("Something went wrong, try again or contact suppport")
      }

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
    <div className='grid content-center justify-center h-[100vh] max-h-[100vh]'>
      <Title order={1} ta="center" >Healthcare Translation App</Title>
      <div className="flex flex-col items-center p-4 gap-3 bg-white rounded-lg shadow">

        <div className='flex flex-row gap-2'>
          <Select label="Input language" defaultValue={inputLanguage} data={
            popularLanguages
          } size='xs'
            onChange={(value) => {
              setInputLanguage(value ?? '')
            }}
          />
          <Select label="output language" defaultValue={outputLanguage} data={
            popularLanguages
          } size='xs'
            onChange={
              (value) => {
                setOutputLanguage(value ?? '')
              }
            }
          />
        </div>

        {/* Recorded Audio */}
        <AudioCardElement title='Recorded Audio' audioURL={audioURL ?? undefined} isLoading={isRecording || isUploadingAudio} transcript={transcribedText ?? undefined} />

        {/* Translated Audio */}
        {
          translatedAudio &&
          <AudioCardElement title='Translated Audio' audioURL={`${translatedAudio}`} isLoading={false} transcript={translatedText ?? undefined} />}



        <div className="w-full mb-4">

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
          {!(["prompt", "granted"].includes(permission)) && <p className='text-black m-auto w-fit '>Please allow microphone permission</p>}
        </div>


      </div >
    </div>
  );
};

export default AudioRecorder;