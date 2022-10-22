import * as THREE from 'three';
import Player from '../player';
import PanoramicControl from './panoramic-control';
import STATE from './state';

import '../../css/panoramic.less';

export default class PanoramicManager {
    container: JQuery;
    player: Player;
    private initialized = false;
    renderWidth!: number;
    renderHeight!: number;
    private padding!: string;
    private webglWrp!: JQuery; // 全景视频区域
    private scene!: THREE.Scene;
    cameraFovInit = 90;
    camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private geometry: any;//THREE.SphereBufferGeometry;
    private texture!: THREE.VideoTexture;
    private material!: THREE.MeshBasicMaterial;
    private mesh!: THREE.Mesh;
    private animation!: number;
    private renderStartTime!: number; // 全景渲染起始时间
    private lagStartTime!: number; // 卡顿起始时间
    private lagSended!: boolean; // 是否发送卡顿埋点
    private crossOrigin = false;
    panoramicControl!: PanoramicControl;
    constructor(player: Player, container: JQuery) {
        this.container = container;
        this.player = player;
        this.init();
    }

    private init() {
        if (this.initialized) {
            return;
        }
        this.initialized = true;
        this.renderWidth = this.container.find('video').width()!;
        this.renderHeight = this.container.find('video').height()!;
        this.padding = this.container.find('video')[0].style.padding;
        this.webglWrp = $(`<div class="${this.player.prefix}-webgl"></div>`).appendTo(this.container);
        this.initRenderConfig();
        this.globalEvents();
    }

    private initRenderConfig() {
        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initGeometry();
        this.panoramicControl = new PanoramicControl(this);
        if (this.player.video) {
            this.updateTexture(this.player.video);
        }
    }

    private initScene() {
        this.scene = new THREE.Scene();
    }

    private initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            this.cameraFovInit,
            this.renderWidth / this.renderHeight,
            0.001,
            3000,
        );
        this.camera.position.set(0, 0, 0); // 将相机位置置于球模型中心，也就是播放区域的中心
        this.camera.lookAt(new THREE.Vector3(0, 0, 1)); // 设置相机视角的目标方向，注意Z值不能大于相机近端面
        this.scene.add(this.camera);
    }

    private initRenderer() {
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(this.renderWidth, this.renderHeight); // 设置渲染区域
        this.renderer.setPixelRatio(self.devicePixelRatio);
        this.webglWrp.append(this.renderer.domElement);
        $(this.renderer.domElement).css({
            padding: this.padding,
        });
    }

    private initGeometry() {
        this.geometry = new (<any>THREE).SphereBufferGeometry(
            this.renderWidth / 2,
            360, // 水平分段数（沿着经线分段）
            180, // 垂直分段数（沿着纬线分段）
            Math.PI / 2, // 水平（经线）起始角度，默认值为0，这里顺时针旋转90度
        );
        this.geometry.scale(1, 1, -1); // 将视频画面置于球模型内部
    }

    private bindTexture(video: HTMLVideoElement) {
        this.texture = new THREE.VideoTexture(video);
        this.texture.generateMipmaps = false;
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;
        this.texture.format = THREE.RGBAFormat;
        this.material = new THREE.MeshBasicMaterial({
            map: this.texture,
        });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);
    }

    updateTexture(video: HTMLVideoElement) {
        try {
            this.crossOrigin = false;
            this.videoCrossOriginCheck(video);
            if (!this.mesh) {
                this.bindTexture(video);
            } else {
                this.texture = new THREE.VideoTexture(video);
                this.material = new THREE.MeshBasicMaterial({
                    map: this.texture,
                });
                this.mesh.material = this.material;
            }
            this.renderer.render(this.scene, this.camera);
            this.display(this.player.get('video_status', 'panoramamode'));
            // this.player.controller.settingButton.panoramamode &&
            //     this.player.controller.settingButton.panoramamode.enable();
        } catch (e) {
            this.crossOrigin = true;
            this.display(false);
            // this.player.controller.settingButton.panoramamode &&
            //     this.player.controller.settingButton.panoramamode.disable();
            this.player.toast &&
                this.player.toast.addBottomHinter({
                    timeout: 4000,
                    closeButton: true,
                    text: '当前清晰度不支持全景模式',
                });
        }
    }

    private videoCrossOriginCheck(video: HTMLVideoElement) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context?.drawImage(video, 0, 0, 1, 1);
        canvas.toDataURL();
    }

    private resize() {
        this.renderWidth = this.container.find('video').width()!;
        this.renderHeight = this.container.find('video').height()!;
        this.padding = this.container.find('video')[0].style.padding;
        this.renderer.setSize(this.renderWidth, this.renderHeight);
        $(this.renderer.domElement).css({
            padding: this.padding,
        });
    }

    private cancelAnimation() {
        window.cancelAnimationFrame(this.animation);
    }

    private setAnimation() {
        this.cancelAnimation();
        this.animation = window.requestAnimationFrame(() => {
            this.setLagTrack();
            this.renderStartTime = Date.now();
            this.renderer.render(this.scene, this.camera);
            this.panoramicControl.update();
            this.setAnimation();
        });
    }

    // 卡顿埋点上报
    private setLagTrack() {
        if (!this.renderStartTime) return;
        const nowTime = Date.now();
        const fps = 1000 / (nowTime - this.renderStartTime);
        if (this.lagSended) return;
        if (fps < 10) {
            if (this.lagStartTime) {
                if (nowTime - this.lagStartTime > 1000) {
                    this.lagSended = true;
                }
            } else {
                this.lagStartTime = nowTime;
            }
        } else {
            this.lagStartTime = 0;
        }
    }

    private globalEvents() {
        const player = this.player;
        player.bind(STATE.EVENT.VIDEO_RESIZE, (event: Event, mode: number) => {
            this.resize();
        });
        player.bind(STATE.EVENT.VIDEO_SIZE_RESIZE, () => {
            this.resize();
        });
        player.bind(STATE.EVENT.VIDEO_PLAYER_RESIZE, () => {
            this.resize();
        });
        this.player.bind(STATE.EVENT.VIDEO_DESTROY, () => {
            this.destroy();
        });
    }

    private destroy() {
        this.cancelAnimation();
        this.renderer.dispose();
        this.geometry.dispose();
        this.material && this.material.dispose();
        this.texture && this.texture.dispose();
        this.webglWrp.remove();
        this.panoramicControl.dispose();
    }

    getCrossOrigin() {
        return this.crossOrigin;
    }

    display(visible: boolean) {
        if (visible) {
            this.webglWrp.show();
            this.panoramicControl.sphereControl.show();
            this.renderStartTime = 0;
            this.lagStartTime = 0;
            this.setAnimation();
        } else {
            this.webglWrp.hide();
            this.panoramicControl.sphereControl.hide();
            this.cancelAnimation();
        }
    }
}
