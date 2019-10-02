import { EditionInfo } from '@/models/edition';
import { CommHelper } from './comm-helper';
import { EditionGroupDTO, ArtefactListDTO, ImagedObjectDTO, ImagedObjectListDTO } from '@/dtos/sqe-dtos';
import { ApiRoutes } from '@/services/api-routes';
import { Artefact } from '@/models/artefact';
import axios from 'axios';
import { ImagedObject } from '@/models/imaged-object';

/*
 * This files contains all the requests to the server, it should only be used
 * by the services, and not anybody on the outside.
 */

export class Requests {
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
}
