/*
 * This file contains various SVG transforms for artefacts. It can be used by components that show artefacts in SVGs
 *
 * Transforms are implemented as getters, to simplify bindings to templates.
 *
 * All transforms assume they're placed on an SVG the size of the edition's metrics, with the edition's ppm.
 */

import { Artefact } from '@/models/artefact';
import { BoundingBox } from './helpers';

class ArtefactTransformer {
    protected boundingBox: BoundingBox;

    public constructor(public artefact: Artefact) {
        this.boundingBox = artefact.mask.getBoundingBox();
    }

    public get croppedImageTransform(): string {
        // Note that we do not zoom the image at all, even though its original resolution depends on imageScale
        // That's because we specify the width and height of the image element, and the browser makes sure the image
        // is scaled to those
        const translate = `translate(${this.boundingBox.x} ${this.boundingBox.y})`;
        return translate;
    }

    public get artefactTransform(): string {
        // Transforming the artefact on the SVG - placing it in the correct place, correct zoom and correct orientation
        const placement = this.artefact.placement;
        if (!placement.scale) {
            return ''; // No transform at all, do nothing
        }

        // First, move bounding box's center to (0, 0)
        const midX = this.boundingBox.x + this.boundingBox.width / 2;
        const midY = this.boundingBox.y + this.boundingBox.height / 2;
        const translateToZero = `translate(-${midX}, -${midY})`;

        // Now, scale and rotate around (0 ,0)
        const scale = `scale(${placement.scale})`; // Scale by scale of transform
        const rotate = `rotate(${placement.rotate})`;

        // Finally, move to correct place. Remember that at this point the artefact's top left is (-midX, -midY)
        const translateX = this.boundingBox.width / 2 + placement.translate.x!;
        const translateY = this.boundingBox.height / 2 + placement.translate.y!;
        const translateToPlace = `translate(${translateX}, ${translateY})`;

        // Transformations are performed by SVG from right to left
        const transform = `${translateToPlace} ${rotate} ${scale} ${translateToZero}`;

        return transform;
    }
}

export { ArtefactTransformer };
