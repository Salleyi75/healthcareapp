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

export async function POST(request: NextRequest) {
    try {
        // Get form data with audio file
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;
        const languageCode = formData.get('languageCode') as string || 'en-US';

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
                languageCode: languageCode,
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

        // Get API key from environment variable
        const apiKey = process.env.GOOGLE_SPEECH_API_KEY;
        if (!apiKey) {
            throw new Error('Google Speech API key not configured');
        }

        // Send request to Google Speech API
        const response = await fetch(
            `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    Accept: "application/json",
                    'Content-Type': 'application/json',
                    "x-google-api-key": apiKey
                },
                body: JSON.stringify(speechRequest),

            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Google API error: ${JSON.stringify(errorData)}`);
        }

        const transcriptionData: SpeechRecognitionResponse = await response.json();

        // Extract transcript from response
        const transcript = transcriptionData.results?.[0]?.alternatives?.[0]?.transcript || '';

        return NextResponse.json({
            success: true,
            transcript,
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



