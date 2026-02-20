import { YoutubeTranscript } from 'youtube-transcript';

const DEFAULT_LIMIT = 12;

const isTranscriptsEnabled = () =>
    String(process.env.YOUTUBE_TRANSCRIPTS || '').toLowerCase() === 'true';

export const fetchTranscriptPreview = async (videoId, limit = DEFAULT_LIMIT) => {
    if (!videoId || !isTranscriptsEnabled()) return null;

    try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        if (!Array.isArray(transcript)) return null;
        return transcript.slice(0, limit).map((line) => line.text).filter(Boolean);
    } catch {
        return null;
    }
};
