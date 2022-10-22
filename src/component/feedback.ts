import Bback from '@jsc/b-back';

interface IFeedback {
    feedback?: Bback;
    loadingFeedback?: boolean;
    load: (callback: Function, windows: Window) => void;
    get: (miniMode?: boolean) => void;
    loadFeedback?: (func: Function, windows: Window) => {};
}

const feedback: IFeedback = {
    load(callback, windows) {
        const that = this;
        const topWindow = windows || window;
        const bgrayBtn = document.querySelector('.player-wrapper .bgray-btn-wrap .bgray-btn.show');
        bgrayBtn && bgrayBtn.classList.add('player-feedback-disable');
        import(
            /* webpackChunkName: "feedback" */
            '@jsc/b-back'
        )
            .then((s) => {
                bgrayBtn && bgrayBtn.classList.remove('player-feedback-disable');
                topWindow.FeedBackInstance = s.default;
                const meta = window.bPlayer?.metadata;
                that.feedback = new topWindow.FeedBackInstance({
                    container: <HTMLElement>document.querySelector('.bilibili-player-video-wrap'),
                    aid: window.player?.getVideoMessage?.()?.aid || window.aid || 0,
                    cid: window.player?.getVideoMessage?.()?.cid || window.cid || 0,
                    bvid: window.player?.getVideoMessage?.()?.bvid || window.bvid || '',
                    version: 'HTML5-' + meta?.version + '-' + meta?.revision,
                    track: (name: string) => {
                    },
                    getPlayInfo: () => {
                        return {
                            cid: window.player?.getVideoMessage?.()?.cid ?? window.cid,
                            url: window.player?.getPlayurl?.() ?? '',
                            videoInfo: window.player?.getVideoMessage?.()?.videoInfo,
                            testLog: window.player?.getVideoMessage?.()?.testLog,
                            eventLog: window.eventLogText || [],
                            progress: window.player?.getCurrentTime?.(),
                            dashDetails: window['dashPlayer']?.getLogHistory?.()?.log
                                ? window['dashPlayer'].getLogHistory?.().log.split('\n')
                                : undefined,
                            showBv: window.show_bv,
                        };
                    },
                });
                if (typeof callback === 'function') {
                    callback();
                }
                that.loadingFeedback = false;
            })
            .catch((e) => {
                that.loadingFeedback = false;
                bgrayBtn && bgrayBtn.classList.remove('player-feedback-disable');
            });
    },
    get(miniMode: boolean = false) {
        if (this.loadingFeedback) {
            return true;
        }
        let windows = null;
        try {
            windows = window.top && window.top.document ? window.top : window;
        } catch (error) {
            windows = window;
        }
        // if (this.feedback) {
        //     this.feedback.show();
        //     return;
        // }
        if (this.feedback) {
            if (!miniMode) {
                this.feedback.show();
            } else {
                directFeedback(this.feedback);
            }
            return;
        }
        if (!this.loadingFeedback) {
            this.loadingFeedback = true;
            this.loadFeedback &&
                this.loadFeedback(() => {
                    if (!miniMode) {
                        this.feedback?.show();
                    } else {
                        directFeedback(this.feedback);
                    }
                    this.loadingFeedback = false;
                }, windows);
        }
        function directFeedback(feedback: any) {
            feedback?.directFeedback((success: boolean) => {
                const issue = document.querySelector('.bilibili-player-video-top-issue');
                const text = document.querySelector('.bilibili-player-video-top-issue-text');
                if (text && issue) {
                    if (success) {
                        text.textContent = '反馈成功';
                    } else {
                        text.textContent = '反馈失败';
                    }
                    setTimeout(() => {
                        feedback.reset();
                        issue.classList.remove('bilibili-player-video-top-issue-click');
                        text.textContent = '一键反馈';
                    }, 2000);
                }
            });
        }
    },
};

export default feedback;

//////////////////////////// 全局增强 ////////////////////////////
declare global {
    interface Window {
        FeedBackInstance: typeof Bback;
    }
}