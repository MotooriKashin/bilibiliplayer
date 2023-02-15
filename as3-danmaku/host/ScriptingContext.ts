import { As3Danmaku } from "..";
import { debug } from "../debug";
import { DisplayObject } from "./Unpack/DisplayObject";
import { Unpack } from "./Unpack/Unpack";

interface ISerializedData {
    class: string;
}
export class ScriptingContext {
    protected objects: Record<string, DisplayObject> = {};
    constructor(private manage: As3Danmaku) { }
    registerObject(objectId: string, serialized: ISerializedData) {
        if (typeof Unpack[<'Button'>serialized["class"]] === "function") {
            this.objects[objectId] = new Unpack[<'Button'>serialized["class"]](this.manage.wrap!,
                serialized, this);
        } else {
            debug.error("Cannot unpack class \"" +
                serialized["class"] + "\". No valid unpacker found");
            return;
        }
    }
    deregisterObject(objectId: string) {
        delete this.objects[objectId];
    };
    updateProperty(objectId: string, propName: string, value: any) {
        // if (!this.objects[objectId]) {
        //     _debug.error( "Object (" + objectId + ") not found.");
        //     return;
        // }
        // if ((<any>this).objects[objectId][propName] === undefined) {
        //     _debug.error( "Property \"" + propName
        //         + "\" not defined for object of type " +
        //         this.objects[objectId].getClass() + ".");
        //     return;
        // }
        (<any>this).objects[objectId][propName] = value;
    };
    callMethod(objectId: string, methodName: string, params: any[]) {
        if (!this.objects[objectId]) {
            debug.error("Object (" + objectId + ") not found.");
            return;
        }
        if (!(<any>this).objects[objectId][methodName]) {
            debug.error("Method \"" + methodName
                + "\" not defined for object of type " +
                this.objects[objectId].getClass() + ".");
            return;
        }
        try {
            (<any>this).objects[objectId][methodName](params);
        } catch (e) {
            if ((<Error>e).stack) {
                debug.error((<Error>e).stack);
            } else {
                debug.error((<Error>e).toString());
            };
        }
    };
    getObject<T extends DisplayObject>(objectId: string): T {
        if (!this.objects.hasOwnProperty(objectId)) {
            debug.error("Object (" + objectId + ") not found.");
            return <T>this.objects[objectId];
        }
        return <T>this.objects[objectId];
    };
    invokeError(msg: any, mode: string) {
        switch (mode) {
            case "err":
                debug.error(msg);
                break;
            case "warn":
                debug.warn(msg);
                break;
            default:
                debug(msg);
                break;
        }
    };
    clear() { }
    getDimensions() {
        return {
            "stageWidth": this.manage.wrap!.offsetWidth,
            "stageHeight": this.manage.wrap!.offsetHeight,
            "screenWidth": window.screen.width,
            "screenHeight": window.screen.height
        };
    };
    manageEvent(id: string, name: string, mode: string) {
        this.objects[id].DOM.addEventListener(name, e => {
            e.stopPropagation();
            this.manage.sendWorkerMessage(`object::(${id})`, {
                type: 'event',
                event: name
            })
        });
    }
}