// app/api/audio/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Type definitions for Google Speech API
interface SpeechRecognitionConfig {
    encoding?: string;
    sampleRateHertz?: number;
    audioChannelCount: number;
    enableSeparateRecognitionPerChannel: boolean;
    languageCode: string;
    alternativeLanguageCodes?: string[];
    maxAlternatives: number;
    profanityFilter: boolean;
    enableAutomaticPunctuation: boolean;
    enableSpokenPunctuation: boolean;
    enableSpokenEmojis: boolean;
    model: string;
    useEnhanced: boolean;
}

interface SpeechRecognitionRequest {
    config: SpeechRecognitionConfig;
    audio: {
        content?: string;
        uri?: string;
    };
}

interface SpeechRecognitionWord {
    startTime?: string;
    endTime?: string;
    word: string;
    confidence?: number;
    speakerTag?: number;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence?: number;
    words?: SpeechRecognitionWord[];
}

interface SpeechRecognitionResult {
    alternatives: SpeechRecognitionAlternative[];
    channelTag?: number;
    resultEndTime?: string;
    languageCode?: string;
}

interface SpeechRecognitionResponse {
    results: SpeechRecognitionResult[];
    totalBilledTime?: string;
    requestId?: string;
}

// Translation Types
interface TranslationRequest {
    q: string;
    target: string;
    source?: string;
    format?: string;
}

interface TranslationResponse {
    data: {
        translations: Array<{
            translatedText: string;
            detectedSourceLanguage?: string;
        }>;
    };
}

// Text-to-Speech Types
interface TTSVoice {
    languageCode: string;
    name?: string;
}

interface TTSInput {
    text: string;
}

interface TTSAudioConfig {
    audioEncoding: string;
    speakingRate?: number;
    pitch?: number;
    volumeGainDb?: number;
}

interface TTSRequest {
    input: TTSInput;
    voice: TTSVoice;
    audioConfig: TTSAudioConfig;
}

interface TTSResponse {
    audioContent: string; // base64 encoded audio
}


export async function POST(request: NextRequest) {
    try {
        // Get API keys from environment variables
        const speechApiKey = process.env.GOOGLE_SPEECH_API_KEY;
        const translateApiKey = process.env.GOOGLE_SPEECH_API_KEY;
        const ttsApiKey = process.env.GOOGLE_SPEECH_API_KEY;

        if (!speechApiKey || !translateApiKey || !ttsApiKey) {
            throw new Error('Missing required API keys');
        }

        // Get form data with audio file
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;
        const sourceLanguage = formData.get('sourceLanguage') as string || 'en-US';
        const targetLanguage = formData.get('targetLanguage') as string || 'es-US';

        if (!audioFile) {
            return NextResponse.json(
                { error: 'No audio file provided' },
                { status: 400 }
            );
        }

        // Convert audio file to base64
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString('base64');

        // Prepare request to Google Speech API
        const speechRequest: SpeechRecognitionRequest = {
            config: {
                audioChannelCount: 1,
                enableSeparateRecognitionPerChannel: false,
                languageCode: sourceLanguage,
                maxAlternatives: 1,
                profanityFilter: false,
                enableAutomaticPunctuation: true,
                enableSpokenPunctuation: false,
                enableSpokenEmojis: false,
                model: "medical_dictation",
                useEnhanced: false
            },
            audio: {
                content: base64Audio
            }
        };

        // Send request to Google Speech API
        const response = await fetch(
            `https://speech.googleapis.com/v1/speech:recognize?key=${speechApiKey}`,
            {
                method: 'POST',
                headers: {
                    Accept: "application/json",
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(speechRequest),

            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GoogleSpeech API error: ${JSON.stringify(errorData)}`);
        }

        const transcriptionData: SpeechRecognitionResponse = await response.json();

        // Extract transcript from response
        const transcript = transcriptionData.results?.[0]?.alternatives?.[0]?.transcript || '';

        if (!transcript) {
            return NextResponse.json({ error: 'No transcript generated' }, { status: 400 });
        }

        // 3. Translation API Call
        const translateRequest: TranslationRequest = {
            q: transcript,
            target: targetLanguage.split('-')[0], // Extract language code without region
            source: sourceLanguage?.split('-')[0], // Optional source language
            format: 'text' // Optional format
        };

        const url = `https://translation.googleapis.com/language/translate/v2?key=${translateApiKey}`;

        console.log("Translate Request body : ", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(translateRequest) // Send the request body as JSON
        })
        const translateResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(translateRequest) // Send the request body as JSON
        });

        if (!translateResponse.ok) {
            const errorResponse = await translateResponse.json();
            throw new Error(`Translation API error: ${translateResponse.statusText}. Details: ${JSON.stringify(errorResponse)}`);
        }

        const translationData: TranslationResponse = await translateResponse.json();
        const translatedText = translationData.data.translations[0].translatedText;

        // 4. Text-to-Speech API Call
        const ttsRequest: TTSRequest = {
            input: { text: translatedText },
            voice: {
                languageCode: targetLanguage,
                // name: `${targetLanguage}-Standard-A` // Generic voice name format
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: 1.0,
                pitch: 0
            }
        };

        console.log("TTS REQUEST : ", `https://texttospeech.googleapis.com/v1/text:synthesize?key=${ttsApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ttsRequest)
            }
        )
        const ttsResponse = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${ttsApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ttsRequest)
            }
        );

        if (!ttsResponse.ok) {
            throw new Error(`TTS API error: ${ttsResponse.statusText}`);
        }

        const ttsData: TTSResponse = await ttsResponse.json();

        return NextResponse.json({
            success: true,
            originalText: transcript,
            translatedText: translatedText,
            audioContent: ttsData.audioContent,
            fullResponse: transcriptionData
        });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to process audio' },
            { status: 500 }
        );
    }
}

// Optional: Handle GET requests
export async function GET() {
    return NextResponse.json({
        message: 'Audio API endpoint ready'
    });
}



