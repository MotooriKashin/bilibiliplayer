import { CCLScripter } from "../CCLScripting";
import { Unpack } from "./Unpack/Unpack";

interface ISerializedData {
    class: string;
}
interface IBaseObject {
    unpackedObject: any;
    destroy(): void;
    getClass(): string;
}
export class ScriptingContext {
    protected objects: Record<string, IBaseObject> = {};
    protected Unpack = Unpack;
    constructor(private scripter: CCLScripter, private stage: HTMLElement) { }
    registerObject(objectId: string, serialized: ISerializedData) {
        if (typeof this.Unpack[serialized["class"]] === "function") {
            this.objects[objectId] = new this.Unpack[serialized["class"]](this.stage,
                serialized, this);
        } else {
            this.scripter.logger.error("Cannot unpack class \"" +
                serialized["class"] + "\". No valid unpacker found");
            return;
        }
    }
    deregisterObject(objectId: string) {
        delete this.objects[objectId];
    };
    updateProperty(objectId: string, propName: string, value: any) {
        if (!this.objects[objectId]) {
            this.scripter.logger.error("Object (" + objectId + ") not found.");
            return;
        }
        if (this.objects[objectId][propName] === undefined) {
            this.scripter.logger.error("Property \"" + propName
                + "\" not defined for object of type " +
                this.objects[objectId].getClass() + ".");
            return;
        }
        this.objects[objectId][propName] = value;
    };
    callMethod(objectId: string, methodName: string, params: any[]) {
        if (!this.objects[objectId]) {
            this.scripter.logger.error("Object (" + objectId + ") not found.");
            return;
        }
        if (!this.objects[objectId][methodName]) {
            this.scripter.logger.error("Method \"" + methodName
                + "\" not defined for object of type " +
                this.objects[objectId].getClass() + ".");
            return;
        }
        try {
            this.objects[objectId][methodName](params);
        } catch (e) {
            if (e.stack) {
                this.scripter.logger.error(e.stack);
            } else {
                this.scripter.logger.error(e.toString());
            };
        }
    };
    getObject(objectId: string) {
        if (!this.objects.hasOwnProperty(objectId)) {
            this.scripter.logger.error("Object (" + objectId + ") not found.");
            return this.objects[objectId];
        }
        return this.objects[objectId];
    };
    invokeError(msg: any, mode: string) {
        switch (mode) {
            case "err":
                this.scripter.logger.error(msg);
                break;
            case "warn":
                this.scripter.logger.warn(msg);
                break;
            default:
                this.scripter.logger.log(msg);
                break;
        }
    };
    clear() { }
    getDimensions() {
        return {
            "stageWidth": this.stage.offsetWidth,
            "stageHeight": this.stage.offsetHeight,
            "screenWidth": window.screen.width,
            "screenHeight": window.screen.height
        };
    };
}