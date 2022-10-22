import * as THREE from 'three';
import { animate, easeOut, PlaybackControls } from 'popmotion';
import PanoramicManager from './panoramic-manager';
import svg from './svg';

export default class PanoramicControl {
    private panoramicManager: PanoramicManager;
    sphereControl!: JQuery;
    private fovRange = {
        min: 40,
        max: 100,
    };

    // 设置旋转范围-垂直方向[0, Math.PI]；水平方向[-2 * Math.PI, 2 * Math.PI]
    private rotateRange = {
        minPhiAngle: 0,
        maxPhiAngle: Math.PI,
        minThetaAngle: -2 * Math.PI,
        maxThetaAngle: 2 * Math.PI,
    };

    private rotateConfig = {
        rotateStart: new THREE.Vector2(0, 0),
        rotateEnd: new THREE.Vector2(),
        rotateDelta: new THREE.Vector2(),
    };
    private angleParams = {
        lastBeta: 0,
        lastGamma: 0,
    };
    private spherical = new THREE.Spherical();
    private sphericalDelta = new THREE.Spherical();
    private EPS = 0.000001;
    private target = new THREE.Vector3(0, 0, 1);
    private target0: THREE.Vector3;
    private position0: THREE.Vector3;
    private rotation0: THREE.Euler;
    private dragDown = false;
    private dragDownPos = {
        x: 0,
        y: 0,
    };
    private controlDown = false;
    private dampingFactor = 0.1; // 鼠标拖拽旋转灵敏度
    private autoRotateTimer: any;
    private rotateTween!: PlaybackControls;
    private wasdDown = false;
    private resetClick = false;
    constructor(panoramicManager: PanoramicManager) {
        this.panoramicManager = panoramicManager;
        this.target0 = this.target.clone();
        this.position0 = this.panoramicManager.camera.position.clone();
        this.rotation0 = this.panoramicManager.camera.rotation.clone();
        this.TPL();
        this.globalEvent();
    }

    private get horizontalRotateSpeed() {
        return (this.panoramicManager.renderWidth * 3) / 40;
    }

    private get verticalRotateSpeed() {
        return this.panoramicManager.renderHeight / 10;
    }

    private TPL() {
        const prefix = this.panoramicManager.player.prefix;
        this.sphereControl = $(`
            <div class="${prefix}-sphere-control">
                <button class="${prefix}-sphere-control-horizontal ${prefix}-sphere-control-left">${svg.left}</button>
                <button class="${prefix}-sphere-control-vertical ${prefix}-sphere-control-up">${svg.up}</button>
                <button class="${prefix}-sphere-control-horizontal ${prefix}-sphere-control-right">${svg.right}</button>
                <button class="${prefix}-sphere-control-vertical ${prefix}-sphere-control-down">${svg.down}</button>
            </div>
        `).appendTo(this.panoramicManager.player.template.playerWrap);
    }

    // 事件绑定
    private globalEvent() {
        const player = this.panoramicManager.player;
        const prefix = player.prefix;
        const container = this.panoramicManager.container;
        const camera = this.panoramicManager.camera;

        player.$window.bind(`keydown${player.config.namespace}`, (e) => {
            if (
                !this.panoramicManager.player.get('video_status', 'panoramamode') ||
                this.panoramicManager.getCrossOrigin()
            ) {
                return;
            }
            if (e && e.keyCode) {
                const code = e.keyCode;
                if (player.controller.getContainerFocus() && player.initialized && player.video) {
                    if (code === 87) {
                        // W 垂直方向视角逆时针旋转
                        this.wasdDown = true;
                        this.sphereRotate('up');
                        return false;
                    } else if (code === 65) {
                        // A 水平方向视角顺时针旋转
                        this.wasdDown = true;
                        this.sphereRotate('left');
                        return false;
                    } else if (code === 83) {
                        // S 垂直方向视角顺时针旋转
                        this.wasdDown = true;
                        this.sphereRotate('down');
                        return false;
                    } else if (code === 68) {
                        // D 水平方向视角逆时针旋转
                        this.wasdDown = true;
                        this.sphereRotate('right');
                        return false;
                    }
                    if (player.controller.getPanoramicFocus()) {
                        if (code === 37 || code === 100) {
                            // ← 水平方向视角顺时针旋转
                            this.sphereRotate('left');
                            return false;
                        } else if (code === 39 || code === 102) {
                            // → 水平方向视角逆时针旋转
                            this.sphereRotate('right');
                            return false;
                        } else if (code === 38 || code === 104) {
                            // ↑ 垂直方向视角逆时针旋转
                            this.sphereRotate('up');
                            return false;
                        } else if (code === 40 || code === 98) {
                            // ↓ 垂直方向视角顺时针旋转
                            this.sphereRotate('down');
                            return false;
                        }
                    }
                }
                return true;
            }
        });

        player.$window.bind(`keyup${player.config.namespace}`, () => {
            if (player.controller.getPanoramicFocus() || this.wasdDown) {
                this.wasdDown = false;
                this.stopRotate();
            }
        });

        const mouseMove = (e: JQuery.Event) => {
            if (!player.get('video_status', 'panoramamode') || this.panoramicManager.getCrossOrigin()) {
                return;
            }
            if (this.dragDown) {
                this.rotateConfig.rotateEnd.set(e.clientX!, e.clientY!);
                this.rotateConfig.rotateDelta.subVectors(this.rotateConfig.rotateEnd, this.rotateConfig.rotateStart);
                this.rotateLeft(this.calcDelta(this.rotateConfig.rotateDelta.x));
                this.rotateUp(this.calcDelta(this.rotateConfig.rotateDelta.y, false));
                this.rotateConfig.rotateStart.copy(this.rotateConfig.rotateEnd);
            }
        };

        const mouseUp = (e: JQuery.Event) => {
            $(document).off('mouseup', mouseUp);
            $(document).off('mousemove', mouseMove);
            if (this.dragDown) {
                if (
                    Math.abs(e.clientX! - this.dragDownPos.x) >= 20 ||
                    Math.abs(e.clientY! - this.dragDownPos.y) >= 20
                ) {
                    player.state.panoramicGesture = true;
                }
                this.dragDown = false;
                player.template.playerArea.removeClass('webgl-state-dragging');
            }
            if (this.controlDown) {
                this.stopRotate();
                this.controlDown = false;
                this.resetClick = false;
            }
        };

        player.template.playerWrap.on('mousedown', (e: JQuery.Event) => {
            if (e.button === 0) {
                $(document).on('mousemove', mouseMove);
                $(document).on('mouseup', mouseUp);
                $(document).on('mouseleave', mouseUp); // 当鼠标移出播放器所在页面，执行mouseup释放操作
                this.dragDown = true;
                player.template.playerArea.addClass('webgl-state-dragging');
                this.sphereControl.removeClass('webgl-dragging');
                this.dragDownPos = {
                    x: e.clientX!,
                    y: e.clientY!,
                };
                this.rotateConfig.rotateStart.set(e.clientX!, e.clientY!);
                player.controller.setPanoramicFocus(false);
                player.controller.setContainerFocus(true);
            }
        });

        player.template.playerWrap.on('mousewheel DOMMouseScroll', (e: any) => {
            if (
                !this.panoramicManager.player.get('video_status', 'panoramamode') ||
                this.panoramicManager.getCrossOrigin()
            ) {
                return;
            }
            e.preventDefault();
            if (player.controller.getPanoramicFocus()) {
                const delta =
                    e['originalEvent']['wheelDelta'] || // chrome & ie
                    (e['originalEvent']['detail'] && -e['originalEvent']['detail']); // firefox
                if (camera.fov + delta * 0.05 >= this.fovRange.min && camera.fov + delta * 0.05 <= this.fovRange.max) {
                    camera.fov += delta * 0.05;
                    camera.updateProjectionMatrix();
                }
            }
        });

        this.sphereControl.on('mousedown', (e: JQuery.MouseDownEvent) => {
            if (
                !this.panoramicManager.player.get('video_status', 'panoramamode') ||
                this.panoramicManager.getCrossOrigin()
            ) {
                return;
            }
            if (e.button === 0) {
                const target = $(e.target);
                $(document).on('mouseup', mouseUp);
                this.controlDown = true;
                if (
                    target.is(`.${prefix}-sphere-control-left`) ||
                    target.parents(`.${prefix}-sphere-control-left`).length === 1
                ) {
                    this.sphereRotate('left');
                    return false;
                } else if (
                    target.is(`.${prefix}-sphere-control-up`) ||
                    target.parents(`.${prefix}-sphere-control-up`).length === 1
                ) {
                    this.sphereRotate('up');
                    return false;
                } else if (
                    target.is(`.${prefix}-sphere-control-right`) ||
                    target.parents(`.${prefix}-sphere-control-right`).length === 1
                ) {
                    this.sphereRotate('right');
                    return false;
                } else if (
                    target.is(`.${prefix}-sphere-control-down`) ||
                    target.parents(`.${prefix}-sphere-control-down`).length === 1
                ) {
                    this.sphereRotate('down');
                    return false;
                } else {
                    this.reset();
                    return true;
                }
            }
        });
    }

    private rotateLeft(angle: number) {
        this.sphericalDelta.theta += angle;
    }

    private rotateUp(angle: number) {
        this.sphericalDelta.phi += angle;
    }

    private calcDelta(delta: number, isHorizontal = true) {
        return isHorizontal
            ? (2 * Math.PI * delta) / (this.panoramicManager.renderWidth * 3)
            : (Math.PI * delta) / this.panoramicManager.renderHeight;
    }

    private quat2Angle(x: number, y: number, z: number, w: number): THREE.Vector3 {
        let pitch, roll, yaw;
        let test = x * y + z * w;
        if (test > 0.499) {
            yaw = 2 * Math.atan2(x, w);
            pitch = Math.PI;
            roll = 0;
            const euler = new THREE.Vector3(pitch, roll, yaw);
            return euler;
        }
        if (test < -0.499) {
            yaw = -2 * Math.atan2(x, w);
            pitch = -Math.PI;
            roll = 0;
            const euler = new THREE.Vector3(pitch, roll, yaw);
            return euler;
        }
        const sqx = Math.pow(x, 2);
        const sqy = Math.pow(y, 2);
        const sqz = Math.pow(z, 2);
        yaw = Math.atan2(2 * y * w - 2 * x * z, 1 - 2 * sqy - 2 * sqz);
        pitch = Math.asin(2 * test);
        roll = Math.atan2(2 * x * w - 2 * y * z, 1 - 2 * sqx - 2 * sqz);
        return new THREE.Vector3(pitch, roll, yaw);
    }

    private setObjectQuaternion(
        quaternion: THREE.Quaternion,
        alpha: number,
        beta: number,
        gamma: number,
        orient: number,
    ) {
        let zee = new THREE.Vector3(0, 0, 1);
        let euler = new THREE.Euler();
        let q0 = new THREE.Quaternion();
        let q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
        euler.set(beta, alpha, -gamma, 'YXZ');
        quaternion.setFromEuler(euler);
        quaternion.multiply(q1);
        quaternion.multiply(q0.setFromAxisAngle(zee, -orient));
    }

    update() {
        let offset = new THREE.Vector3();
        let quat = new THREE.Quaternion().setFromUnitVectors(
            this.panoramicManager.camera.up,
            new THREE.Vector3(0, 1, 0),
        );
        let quatInverse = quat.clone().invert();
        let lastPosition = new THREE.Vector3();
        let lastQuaternion = new THREE.Quaternion();
        let currentQ = new THREE.Quaternion().copy(this.panoramicManager.camera.quaternion);
        this.setObjectQuaternion(currentQ, 0, 0, 0, 0);
        let currentAngle = this.quat2Angle(currentQ.x, currentQ.y, currentQ.z, currentQ.w);
        this.rotateLeft(this.angleParams.lastGamma - currentAngle.z);
        this.angleParams.lastBeta = currentAngle.y;
        this.angleParams.lastGamma = currentAngle.z;
        let position = this.panoramicManager.camera.position;
        offset.copy(position).sub(this.target);
        offset.applyQuaternion(quat);
        this.spherical.setFromVector3(offset);
        this.spherical.theta += this.sphericalDelta.theta * this.dampingFactor;
        this.spherical.phi += this.sphericalDelta.phi * this.dampingFactor;
        this.spherical.theta = Math.max(
            this.rotateRange.minThetaAngle,
            Math.min(this.rotateRange.maxThetaAngle, this.spherical.theta),
        );
        this.spherical.phi = Math.max(
            this.rotateRange.minPhiAngle,
            Math.min(this.rotateRange.maxPhiAngle, this.spherical.phi),
        );
        this.spherical.makeSafe();
        offset.setFromSpherical(this.spherical);
        offset.applyQuaternion(quatInverse);
        position.copy(this.target).add(offset);
        this.panoramicManager.camera.lookAt(this.target);
        this.sphericalDelta.theta *= 1 - this.dampingFactor;
        this.sphericalDelta.phi *= 1 - this.dampingFactor;
        if (
            lastPosition.distanceToSquared(this.panoramicManager.camera.position) > this.EPS ||
            8 * (1 - lastQuaternion.dot(this.panoramicManager.camera.quaternion)) > this.EPS
        ) {
            lastPosition.copy(this.panoramicManager.camera.position);
            lastQuaternion.copy(this.panoramicManager.camera.quaternion);
        }
    }

    /**
     * 视角旋转变换
     * @param direction string 旋转方向
     */
    private sphereRotate(direction: string) {
        clearInterval(this.autoRotateTimer);
        let horizontal = true;
        let delta: number;
        switch (direction) {
            case 'left':
                horizontal = true;
                delta = this.horizontalRotateSpeed;
                break;
            case 'right':
                horizontal = true;
                delta = -this.horizontalRotateSpeed;
                break;
            case 'up':
                horizontal = false;
                delta = this.verticalRotateSpeed;
                break;
            case 'down':
                horizontal = false;
                delta = -this.verticalRotateSpeed;
                break;
            default:
                break;
        }
        if (horizontal) {
            const rotate = () => {
                this.rotateTween = animate({
                    from: {
                        x: this.rotateConfig.rotateStart.x,
                    },
                    to: {
                        x: this.rotateConfig.rotateStart.x + delta,
                    },
                    duration: 100,
                    ease: easeOut,
                    onUpdate: (o: { x: number }) => {
                        this.rotateConfig.rotateEnd.set(o.x, this.rotateConfig.rotateStart.y);
                        this.rotateConfig.rotateDelta.subVectors(
                            this.rotateConfig.rotateEnd,
                            this.rotateConfig.rotateStart,
                        );
                        this.rotateLeft(this.calcDelta(this.rotateConfig.rotateDelta.x));
                        this.rotateConfig.rotateStart.copy(this.rotateConfig.rotateEnd);
                    },
                });
            };
            rotate();
            this.autoRotateTimer = setInterval(rotate, 40);
        } else {
            const rotate = () => {
                this.rotateTween = animate({
                    from: {
                        y: this.rotateConfig.rotateStart.y,
                    },
                    to: {
                        y: this.rotateConfig.rotateStart.y + delta,
                    },
                    duration: 100,
                    ease: easeOut,
                    onUpdate: (o: { y: number }) => {
                        this.rotateConfig.rotateEnd.set(this.rotateConfig.rotateStart.x, o.y);
                        this.rotateConfig.rotateDelta.subVectors(
                            this.rotateConfig.rotateEnd,
                            this.rotateConfig.rotateStart,
                        );
                        this.rotateUp(this.calcDelta(this.rotateConfig.rotateDelta.y));
                        this.rotateConfig.rotateStart.copy(this.rotateConfig.rotateEnd);
                    },
                });
            };
            rotate();
            this.autoRotateTimer = setInterval(rotate, 40);
        }
    }

    private stopRotate() {
        clearInterval(this.autoRotateTimer);
    }

    private reset() {
        this.resetClick = true;
        this.target.copy(this.target0);
        this.panoramicManager.camera.position.copy(this.position0);
        this.panoramicManager.camera.rotation.copy(this.rotation0);
        this.panoramicManager.camera.fov = this.panoramicManager.cameraFovInit;
        this.panoramicManager.camera.updateProjectionMatrix();
    }

    dispose() {
        this.sphereControl.remove();
        this.panoramicManager.container.off('mousedown');
        this.sphereControl.off('mousedown');
        $(document).off('mouseup');
        $(document).off('mouseleave');
        this.panoramicManager.container.off('mousewheel DOMMouseScroll');
        clearInterval(this.autoRotateTimer);
    }
}
