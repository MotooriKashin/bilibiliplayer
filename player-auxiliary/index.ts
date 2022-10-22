import Player from '@jsc/bilibiliplayer/js/player';
import './css/index.less';

/**
 * @desc Promise polyfill
 */
// import 'promise-polyfill/src/polyfill';

import Auxiliary from './js/auxiliary';
// import rebuildPlayerConfig from './js/io/rebuild-player-config';

export default class PlayerAuxiliary {
    directiveDispatcher!: (received: any) => void;
    destroy!: () => void;
    constructor(player: Player, input: any, bVideo?: any) {
        // const config = rebuildPlayerConfig(input); // 播放器那里重建过了
        const auxiliary = new Auxiliary(player, input, bVideo);
        $.extend(this, {
            directiveDispatcher: function (received: any) {
                return auxiliary.directiveManager.receiver(received);
            },
            resize: function () {
                return auxiliary.resize();
            },

            destroy: function () {
                return auxiliary.destroy();
            }
        });
    }
}
