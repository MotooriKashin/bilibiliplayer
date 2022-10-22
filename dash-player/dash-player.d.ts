/**
 * TODO: 完善声明
 * @file dashjs
 */
class DashPlayer {
    constructor(video: HTMLVideoElement, config: Record<string, any>);
    static isBwpHEVCPrefSupported(): boolean;
    static isEC3DolbyATMOSTypeSupported(): boolean;
    static isHEVCDolbyVisionTypeSupported(): boolean;
    static isHEVCHDR10TypeSupported(): boolean;
    static isHEVC8kTypeSupported(): boolean;
    static isHEVCTypeSupported(): boolean;
    static isFLACTypeSupported(): boolean;
    static EVENTS: {
        ERROR: string;
        WARNING: string;
        VIDEO_INFO: string;
        QUALITY_CHANGE_RENDERED: string;
        QUALITY_CHANGE_REQUESTED: string;
        BUFFERING_OPTIMIZATION: string;
        FRAGMENT_LOADING_COMPLETED: string;
        FRAGMENT_LOADING_ABANDONED: string;
        FRAGMENT_LOADING_HEADER_RECEIVED: string;
        QUOTA_EXCEEDED: string;
        FRAGMENT_P2P_LOAD_INFO: string;
        APPENDED_NEXT_SOURCE_DURATION_CHANGED: string;
        SOURCE_INITIALIZED: string;
    };
    static STRING: {
        ABR_DYNAMIC: unknown;
    }
    initialize(...param: any[]): any;
    setAutoSwitchQualityFor(type: string, value: boolean): DashPlayer;
    setAutoSwitchTopQualityFor(type: string, value?: number): DashPlayer;
    seek(t: number): void;
    getCurrentCodecID(value: string): number;
    getLogHistory(): {
        log: string;
    };
    getCorePlayer(): {
        getAverageThroughput: (key: string) => number;
        on(event: string, listener: (...args: any[]) => void): void;
        off(event: string, listener: (...args: any[]) => void): void;
        getInitializeDate(): FragmentLoadingAbandonedEvent["request"]["requestStartDate"];
        setP2pPermission(flag: boolean, val: number): void;
        setBufferToKeep(num: number): void;
    };
    destroy(): void;
    on(event: string, listener: (...args: any[]) => void): void;
    off(event: string, listener: (...args: any[]) => void): void;
    attachMediaElement(mediaElement: HTMLMediaElement): void;
    detachMediaElement(): void;
    load(): void;
    unload(): void;
    play(): Promise<void> | void;
    pause(): void;
    type: string;
    buffered: TimeRanges;
    duration: number;
    volume: number;
    muted: boolean;
    currentTime: number;
    initialize(url: string): Promise<void>;
    setAutoSwitchQualityFor(key: string, bol?: boolean): void;
    state: {
        qualityNumberMap: {
            video: Record<string, number>;
        };
        currentQualityIndex: {
            video: number;
        };
        statisticsInfo: IStatInfoInterface;
        mediaInfo: IMediaInfoInterface;
    };
    switchSuccess?: boolean;
    appendSource(mediaDataSourceUrl: string, preloadVideoData: unknown, flag: boolean): Promise<{ cost: number }>;
    switchSource(mediaDataSourceUrl: string, preloadVideoData: unknown, flag: boolean): Promise<{ cost: number }>;
    getCurrentPlayURLFor(type: string): string;
    getBufferLength(type?: string): number;
    getNetworkActivity(): number;
    getBufferingInfo(): Record<string, any>;
    getStableBufferTime(): number;
    setStableBufferTime(time: number): void;
    updateSource?(url: string): Promise<boolean>;
    isLoadingFragment?(url: string): boolean;
    getVideoInfo(): DashPlayer['state'];
    setEndOfStreamState(v: boolean): void;
    getQualityNumberFromQualityIndex(qua: number, type: string): number;
    getQualityFor(type: string): number;
    setQualityFor(type: string, value: unknown): Promise<void>;
    getNextFragmentHistoryInfo?(): string;
}
declare namespace DashPlayer {
    type Player = DashPlayer;
}
export default DashPlayer;
export interface FragmentLoadingAbandonedEvent {
    index: number;
    mediaType: 'audio' | 'video';
    qn: number;
    request: {
        bytesLoaded: number;
        requestStartDate: {
            getTime: () => number;
        };
        headersReceivedDate: {
            getTime: () => number;
        };
        requestEndDate: {
            getTime: () => number;
        };
        index: number;
        mediaType: 'audio' | 'video';
    }
};
export interface FragmentLoadingCompletedEvent extends FragmentLoadingAbandonedEvent { };
export interface MediaPlayerEvents {
    FRAGMENT_LOADING_ABANDONED: string;
    FRAGMENT_LOADING_COMPLETED: string;
};
export interface IMediaInfoInterface {
    audioChannelCount?: number;
    audioCodec?: string;
    audioDataRate?: number;
    audioSampleRate?: number;
    chromaFormat?: string;
    duration: number;
    fps?: number;
    hasAudio?: boolean;
    hasKeyframesIndex?: boolean;
    hasVideo?: boolean;
    height: number;
    level?: string;
    metadata?: IMetadataInterface;
    mimeType: string;
    profile?: string;
    sarDen?: number;
    sarNum?: number;
    segmentCount?: number;
    videoCodec?: string;
    videoDataRate?: number;
    width: number;
    [key: string]: any;
}

export interface IStatInfoInterface {
    currentSegmentIndex?: number;
    decodedFrames: number;
    droppedFrames: number;
    hasRedirect?: boolean;
    loaderType?: LoaderType; // e
    playerType: PlayerType; // e
    speed?: number;
    totalSegmentCount?: number;
    url: string;

    videoURL?: string;
    audioURL?: string;
    audioCurrentSegmentIndex?: number;
    audioTotalSegmentCount?: number;
    videoConnectionSpeed?: number;
    audioConnectionSpeed?: number;
    networkActivity?: number;
}

// should move to flvjs
export type PlayerType = 'NativePlayer' | 'FlvPlayer' | 'DashPlayer';
export type LoaderType =
    | 'fetch-stream-loader'
    | 'websocket-loader'
    | 'xhr-moz-chunked-loader'
    | 'xhr-msstream-loader'
    | 'xhr-range-loader';

export interface IMetadataInterface {
    audiocodecid: number;
    audiodatarate: number;
    audiosamplerate: number;
    audiosamplesize: number;
    audiosize: number;
    canSeekToEnd: boolean;
    creator: string;
    datasize: number;
    description?: string;
    duration: number;
    filesize: number;
    framerate: number;
    hasAudio: boolean;
    hasKeyframes: boolean;
    hasMetadata: boolean;
    hasVideo: boolean;
    height: number;
    keyframes: Array<number> | null;
    lastkeyframelocation: number;
    lastkeyframetimestamp: number;
    lasttimestamp: number;
    metadatacreator: string;
    stereo: boolean;
    videocodecid: number;
    videodatarate: number;
    videosize: number;
    width: number;
}