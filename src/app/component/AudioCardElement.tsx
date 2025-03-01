import { Loader } from "@mantine/core"


type AudioCardElementProps = {
    audioURL?: string,
    isLoading?: boolean,
    transcript?: string,
    title: string,
}

export default function AudioCardElement(props: AudioCardElementProps) {


    return (
        <div className="self-stretch p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <a href="#">
                <h5 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{props.title}</h5>
            </a>
            <div className=" text-gray-500 dark:text-gray-400 mb-3" aria-hidden="true" >
                {props.audioURL ? <audio controls src={props.audioURL} className="w-full" /> : <a href="#" className="inline-flex font-medium items-center text-blue-600 hover:underline">
                    Record some audio
                </a>}

            </div>
            {/* <audio controls src={audioURL} className="w-full"  /> */}
            {props.isLoading && <div><Loader className="m-auto" /></div>}
            {props.transcript && <p className="mb-3 font-normal text-gray-500 dark:text-gray-400">
                Transcription
                <br />
                {props.transcript}
            </p>}

        </div>
    )
}