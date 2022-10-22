interface ILogLevel {
    log: 'log';
    warn: 'warn';
    error: 'error';
}

interface ILogLabel {
    normal: 0;
    action: 1; // Event Log Panel
}

interface IErrorLike {
    message: string;
    stack?: string;
    label?: ILogLabel[keyof ILogLabel];
    timestamp?: number;
}

export interface ICacheItem {
    level: keyof ILogLevel;
    label: ILogLabel[keyof ILogLabel];
    message: string;
    timestamp: number;
    refdata: any;
}

class InternalLogger {
    readonly limit = 10000;
    readonly cache: ICacheItem[] = [];
    readonly level: ILogLevel = { log: 'log', warn: 'warn', error: 'error' };
    readonly label: ILogLabel = { normal: 0, action: 1 };

    private readonly enabled: boolean = false;

    private add(level: keyof ILogLevel, msg: string | IErrorLike, refdata?: any) {
        while (this.cache.length >= this.limit) {
            this.cache.shift();
        }

        const item: ICacheItem = {
            level: level,
            label: this.label.normal,
            message: 'N/A',
            refdata: 'N/A',
            timestamp: Date.now(),
        };

        if (typeof msg === 'string') {
            item.message = msg;
        } else {
            const errorLike = <IErrorLike>msg;
            if (typeof errorLike.stack === 'string') {
                item.message = errorLike.stack;
            } else {
                item.message = errorLike.message;
            }
            if (errorLike.timestamp) {
                item.timestamp = errorLike.timestamp;
            }
            if (typeof errorLike.label === 'number') {
                item.label = errorLike.label;
            }
        }

        if (refdata != null) {
            item.refdata = refdata;
        }

        if (this.enabled && typeof console !== 'undefined' && typeof console[level] === 'function') {
            if (refdata != null) {
                console[level](item.message, refdata);
            } else {
                console[level](item.message);
            }
        }

        this.cache.push(item);
    }

    l(msg: string | IErrorLike, refdata?: any) {
        this.add(this.level.log, msg, refdata);
    }

    w(msg: string | IErrorLike, refdata?: any) {
        this.add(this.level.warn, msg, refdata);
    }

    e(msg: string | IErrorLike, refdata?: any) {
        this.add(this.level.error, msg, refdata);
    }

    serialize() {
        const refs: string[] = [];
        const padNum = Math.max(...Object.keys(this.level).map((x) => x.length));
        this.cache.forEach((item) => {
            const p = {
                level: item.level.toUpperCase(),
                time: new Date(item.timestamp).toISOString(),
                message: item.message,
                refdata: item.refdata,
            };
            while (p.level.length < padNum) p.level += '.';
            if (typeof p.refdata !== 'string') {
                try {
                    p.refdata = JSON.stringify(item.refdata);
                } catch (e: any) {
                    this.w(e);
                }
            }
            refs.push(`[${p.level}]-[${p.time}]-[${p.message}]-[${p.refdata}]`);
        });
        return refs.join('\r\n');
    }

    clearCache() {
        this.cache.length = 0;
    }
}

export const logger = new InternalLogger();
