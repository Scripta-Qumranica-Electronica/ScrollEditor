import { EditionInfo } from '@/models/edition';
import { CommHelper } from './comm-helper';
import { EditionGroupDTO, ArtefactListDTO, ImagedObjectDTO, ImagedObjectListDTO } from '@/dtos/sqe-dtos';
import { ApiRoutes } from '@/variables';
import { Artefact } from '@/models/artefact';
import axios from 'axios';
import { ImagedObject } from '@/models/imaged-object';

/*
 * This files contains all the requests to the server, it should only be used
 * by the services, and not anybody on the outside.
 */

export class Requests {
    public static async requestEdition(editionId: number): Promise<EditionInfo> {
        const response = await CommHelper.get<EditionGroupDTO>(ApiRoutes.editionUrl(editionId));

        // Convert the server response into a single EditionInfo entity, putting all the other versions
        // in its otherVersions array
        const primary = new EditionInfo(response.data.primary);
        if (!primary) {
            throw new Error('Server did not return the version we asked for');
        }
        const others = response.data.others.map((obj) => new EditionInfo(obj));
        primary.otherVersions = others;

        return primary;
    }

    public static async requestEditionArtefacts(editionId: number): Promise<Artefact[]> {
        const response = await CommHelper.get<ArtefactListDTO>(
            ApiRoutes.allEditionArtefactsUrl(editionId, true)
        );

        return response.data.artefacts.map((d: any) => new Artefact(d));
    }

    public static async requestImageManifest(manifestUrl: string): Promise<any> {
        const response = await axios.get(manifestUrl);
        return response.data;
    }

    public static async requestImagedObjectArtefacts(editionId: number, imagedObjectId: string): Promise<Artefact[]> {
        const response = await CommHelper.get<ImagedObjectDTO>(
            ApiRoutes.editionImagedObjectUrl(editionId, imagedObjectId, true)
        );

        let artefactList: Artefact[] = [];
        if (response.data.artefacts) {
            artefactList = response.data.artefacts.map((obj: any) => new Artefact(obj));
        }

        return artefactList;
    }

    public static async requestEditionImagedObjects(editionId: number): Promise<ImagedObject[]> {
        const response = await CommHelper.get<ImagedObjectListDTO>(
            ApiRoutes.allEditionImagedObjectsUrl(editionId, true)
        );

        return response.data.imagedObjects.map((d: any) => new ImagedObject(d));
    }
}
