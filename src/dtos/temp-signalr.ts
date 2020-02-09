import {
    EditionDTO, ArtefactDTO, InterpretationRoiDTO, InterpretationRoiDTOList, BatchEditRoiResponseDTO,
    UpdatedInterpretationRoiDTO, UpdatedInterpretationRoiDTOList
} from './sqe-dtos';
import { HubConnection } from '@microsoft/signalr';

export class SignalRUtilities {
    private _connection: HubConnection;

    public constructor(connection: HubConnection) {
        this._connection = connection;
    }

    public connectUpdatedEdition(handler: (edition: EditionDTO) => void) {
        this._connection.on('UpdatedEdition', handler);
    }

    public disconnectUpdatedEdition(handler: (edition: EditionDTO) => void) {
        this._connection.off('UpdatedEdition', handler);
    }


    public connectCreatedArtefact(handler: (artefact: ArtefactDTO) => void) {
        this._connection!.on('CreatedArtefact', handler);
    }

    public disconnectCreatedArtefact(handler: (artefact: ArtefactDTO) => void) {
        this._connection!.off('CreatedArtefact', handler);
    }

    public connectDeletedArtefact(handler: (id: number) => void) {
        this._connection!.on('DeletedArtefact', handler);
    }

    public disconnectDeletedArtefact(handler: (id: number) => void) {
        this._connection!.off('DeletedArtefact', handler);
    }

    public connectUpdatedArtefact(handler: (artefact: ArtefactDTO) => void) {
        this._connection!.on('UpdatedArtefact', handler);
    }

    public disconnectUpdatedArtefact(handler: (artefact: ArtefactDTO) => void) {
        this._connection!.off('UpdatedArtefact', handler);
    }

    public connectCreatedRoi(handler: (roi: InterpretationRoiDTO) => void) {
        this._connection!.on('CreatedRoi', handler);
    }

    public disconnectCreatedRoi(handler: (roi: InterpretationRoiDTO) => void) {
        this._connection!.off('CreatedRoi', handler);
    }

    public connectCreatedRoisBatch(handler: (roiList: InterpretationRoiDTOList) => void) {
        this._connection!.on('CreatedRoisBatch', handler);
    }

    public disconnectCreatedRoisBatch(handler: (roiList: InterpretationRoiDTOList) => void) {
        this._connection!.off('CreatedRoisBatch', handler);
    }

    public connectEditedRoisBatch(handler: (rois: BatchEditRoiResponseDTO) => void) {
        this._connection!.on('EditedRoisBatch', handler);
    }

    public disconnectEditedRoisBatch(handler: (rois: BatchEditRoiResponseDTO) => void) {
        this._connection!.off('EditedRoisBatch', handler);
    }

    public connectUpdatedRoi(handler: (roi: UpdatedInterpretationRoiDTO) => void) {
        this._connection!.on('UpdatedRoi', handler);
    }

    public disconnectUpdatedRoi(handler: (roi: UpdatedInterpretationRoiDTO) => void) {
        this._connection!.off('UpdatedRoi', handler);
    }

    public connectUpdatedRoisBatch(handler: (rois: UpdatedInterpretationRoiDTOList) => void) {
        this._connection!.on('UpdatedRoisBatch', handler);
    }

    public disconnectUpdatedRoisBatch(handler: (rois: UpdatedInterpretationRoiDTOList) => void) {
        this._connection!.off('UpdatedRoisBatch', handler);
    }

    public connectDeletedRoi(handler: (roiId: number) => void) {
        this._connection!.on('DeletedRoi', handler);
    }

    public disconnectDeletedRoi(handler: (roiId: number) => void) {
        this._connection!.off('DeletedRoi', handler);
    }

    public async subscribeToEdition(editionId: number): Promise<void> {
        return await this._connection!.invoke('SubscribeToEdition', editionId);
    }

    public async unsubscribeToEdition(editionId: number): Promise<void> {
        return await this._connection!.invoke('UnsubscribeToEdition', editionId);
    }
}
