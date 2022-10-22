// import node dependencies

// import less

// import components
import qrcode from './components/qrcode';

class QRcode {
    constructor(el, options) {
        this.qrcode = qrcode;
        this.el = el;
        this.options = options;
        this.init();
    }

    init() {
        if (!this.el) return;
        this.qrcode(this.el, this.options);
    }

    _setOptions(options) {
        this.options = options;
    }

    setOptions(options) {
        this._setOptions(options);
    }

    _setEl(el) {
        this.el = el;
    }

    setEl(el) {
        this._setEl(el);
    }
}

export default QRcode;
