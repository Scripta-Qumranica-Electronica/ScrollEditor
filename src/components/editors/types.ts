import { Position } from '@/utils/PointerTracker';
import { ImageSetting } from '@/components/image-settings/types';

export interface ZoomRequestEventArgs {
    amount: number;
    clientPosition: Position; // Position in client coordinates
}

export interface BaseEditorParams {
    imageSettings: ImageSetting;
    zoom: number;
    rotationAngle: number;
}
