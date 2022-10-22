interface IConfigInterface {
    density: number;
    pool: number;
    speed?: number;
}

const densityFilter = {
    field: 1000,
    duration: 3,
    liveStart: 0,
    liveCurrent: 0,
    density: 0,
    speed: 1.2, // 0.1-2 速度因子
    // 实时弹幕的密度控制:维持一个实时弹幕计数区间,不需要弹幕数据,只需要适时调用
    resize: function () {
        this.liveCurrent = 0;
    },
    validateLive: function (config?: IConfigInterface) {
        (<any>this).config = config;
        this.density = config?.density!;
        if (config?.speed) {
            this.speed = config.speed;
        }
        if (this.density < 0 || config?.pool !== 0) {
            return true;
        }
        // 一个区间内最大的弹幕数目:每次使用都再次计算，不需要考虑与配置同步问题
        let maxField = Math.floor((((this.density * (0.5 * this.speed)) / this.duration) * this.field) / 1000);
        if (maxField < 1) {
            maxField = 1;
        }
        if (this.liveStart === 0) {
            this.liveStart = +new Date();
        }
        const time = +new Date();
        // 上一个区间完成：不一定与这个区间相邻（弹幕比较少的情况）
        if (time > this.liveStart + this.field) {
            this.liveCurrent = 0;
            while (time > this.liveStart + this.field) {
                this.liveStart += this.field;
            }
        }
        if (this.liveCurrent < maxField) {
            this.liveCurrent++;
            return true;
        }
        return false;
    },
};

export default densityFilter;
