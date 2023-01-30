import { __OOAPI, __schannel } from './OOAPI'
import { Runtime } from './api/Runtime/Runtime';
import { Display } from './api/Display/Display';
import { Tween } from './api/Tween/Tween';
import { Utils } from './api/Utils';
import { Global } from './api/Global/Global';
import { trace, load, clone, foreach } from './api/Function';

const $ = Display;
const getTimer = Utils.getTimer;
const interval = Utils.interval;
const timer = Utils.timer;
const $G = Global;

// Hook independent channels that cannot be removed
__OOAPI.createChannel("::eval", 1, Math.round(Math.random() * 100000));
__OOAPI.createChannel("::debug", 1, Math.round(Math.random() * 100000));

