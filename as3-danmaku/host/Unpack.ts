import { Bitmap } from "./Unpack/Bitmap";
import { BitmapData } from "./Unpack/BitmapData";
import { Button } from "./Unpack/Button";
import { Shape } from "./Unpack/Shape";
import { Sprite, SpriteRoot } from "./Unpack/Sprite";
import { TextField } from "./Unpack/TextField";

export const Unpack = new (class {
    Bitmap = Bitmap;
    BitmapData = BitmapData;
    Button = Button;
    Shape = Shape;
    Sprite = Sprite;
    SpriteRoot = SpriteRoot;
    TextField = TextField;
})();