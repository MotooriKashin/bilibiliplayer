interface IOptions {
    prefix?: string;
    title?: string;
    theme?: string;
    info?: string;
    btns?: IBtn[];
    appendTo?: JQuery;
    autoOpen?: boolean;
    mask?: boolean;
    position?: string;
    width?: string;
    onOpen?: () => void;
    onClose?: () => void;
    [key: string]: any;
}

interface ITemplete {
    container?: JQuery;
    title?: JQuery;
    close?: JQuery;
    info?: JQuery;
    btns?: JQuery;
}

interface IBtn {
    type?: string;
    text?: string;
    click?: () => void;
}

class Modal {
    private prefix: string;
    private reOptions: IOptions;
    private inited = false;
    template!: ITemplete;

    constructor(opts: IOptions) {
        this.prefix = opts.prefix || '';
        this.reOptions = $.extend(
            {
                title: 'Bilibili Player Modal',
                theme: 'default',
                info: 'Are you sure operation?',
                btns: [
                    {
                        type: 'submit',
                        text: 'Confirm',
                        click: function () {
                            console.log('Confirm btn clicked.');
                        },
                    },
                    {
                        type: 'cancel',
                        text: 'Cancel',
                        click: function () {
                            console.log('Cancel btn clicked.');
                        },
                    },
                ],
                appendTo: $(document.body),
                onOpen: function () { },
                onClose: function () { },
                autoOpen: true,
                mask: true,
                position: 'center-center',
                width: '260px',
            },
            opts,
        );
    }

    private initialize() {
        if (!this.inited) {
            this.inited = true;

            console.log('Modal initialize..');

            this.create().bindEvents();
        }
    }

    refresh() { }

    open() {
        if (!this.inited) {
            this.initialize();
        }

        this.refreshPos();
        this.template.container?.show();
        'function' === typeof this.reOptions.onOpen && this.reOptions.onOpen();
    }

    close() {
        if (!this.inited) {
            this.initialize();
        }

        this.template.container?.hide();
        'function' === typeof this.reOptions.onClose && this.reOptions.onClose();
    }

    private option(key: string, value: any) {
        // console.log('%cAre U Ok? '  + key + value , 'color:red;font-size:30px;');
        if ('undefined' !== $.type(value)) {
            switch (key) {
                case 'title':
                    value && this.template.title!.html(value);
                    break;
                case 'info':
                    value && this.template.info!.html(value);
                    break;
                case 'btns':
                    this.template.btns!.html('');
                    this.createBtn(value);
                    break;
                default:
                    break;
            }
        } else {
            return this.reOptions[key];
        }
    }

    options(opts: IOptions) {
        if (!this.inited) {
            this.initialize();
        }

        // console.log(opts);
        if (opts && opts instanceof Object) {
            for (const k in opts) {
                if (this.reOptions.hasOwnProperty(k)) {
                    this.option(k, opts[k]);
                }
            }
        }
    }

    destroy() {
        if (!this.inited) {
            this.initialize();
        }

        this.template.container!.remove();
        for (const k in this) {
            if (this.hasOwnProperty(k)) {
                console.log(k);
            }
        }
    }

    private getClassName(className: string, isFind?: boolean) {
        let res = this.prefix + '-modal-' + className;
        if (isFind) {
            res = '.' + res;
        }
        return res;
    }

    private snippet() {
        const prefix = this.prefix;
        return [
            '<div class="' + prefix + '-modal-container" style="display: none">',
            '<div class="' + prefix + '-modal-header">',
            '<div class="' + prefix + '-modal-title"></div>',
            '<button class="' +
            prefix +
            '-modal-close bpm-btn" title="关闭"><i class="' +
            prefix +
            '-iconfont ' +
            prefix +
            '-panel-close icon-12close"></i></button>',
            '</div>',
            '<div class="' + prefix + '-modal-body">',
            '<div class="' + prefix + '-modal-info"></div>',
            '<div class="' + prefix + '-modal-btns"></div>',
            '</div>',
            '</div>',
        ];
    }

    private create() {
        const modal = $(this.snippet().join(''));
        const options = this.reOptions;
        const btns = options.btns;
        // console.log(this, _modal.find('.' + this.prefix + '-modal-title'));

        this.template = {
            container: modal,
            title: modal.find(this.getClassName('title', true)),
            close: modal.find(this.getClassName('close', true)),
            info: modal.find(this.getClassName('info', true)),
            btns: modal.find(this.getClassName('btns', true)),
        };

        this.template.container!.addClass(options.position!);

        this.refreshPos();

        this.template.title!.html(options.title!);

        this.template.info!.html(options.info!);

        this.createBtn(this.reOptions.btns!);

        options.appendTo!.append(modal);

        if (options.autoOpen) {
            this.open();
        }

        return this;
    }

    private createBtn(data: IBtn | IBtn[]) {
        const that = this;

        if (data instanceof Array) {
            // multiple btn
            data.forEach(function (val) {
                that.createBtn(val);
            });
        } else if (data && data instanceof Object) {
            // single btn
            const button = $('<button>')
                .addClass(this.getClassName('btn') + ' bpm-btn')
                .html(data.text!)
                .attr('data-type', data.type!);
            const clickArr: any[] = [];

            'function' === typeof data.click && clickArr.push(data.click);

            'cancel' === data.type!.toLowerCase() && clickArr.push(this.close);

            button.on('click', function (e) {
                clickArr.forEach(function (val) {
                    val.call(that);
                });
            });
            this.template.btns!.append(button);
        }
    }

    private bindEvents() {
        const that = this;
        this.template.close!.on('click', function (e) {
            that.close();
        });
        return this;
    }

    private refreshPos() {
        const options = this.reOptions;
        const c = options.appendTo;
        const container = this.template.container;
        let left;
        let top;

        switch (options.position) {
            case 'center-center':
                left = '50%';
                top = '50%';
                break;
            default:
                break;
        }

        container![0].style.cssText = `width: ${options.width}; top: ${top};left: ${left}; transform: translate(-50%, -50%)`;
    }
}

export default Modal;
