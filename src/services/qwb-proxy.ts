import { QwbWordVariantListDTO, QwbParallelListDTO, QwbBibliographyEntryDTO } from '@/dtos/sqe-dtos';
import { CommHelper } from './comm-helper';
import axios from 'axios';
import { ApiRoutes } from './api-routes';

export default class QwbProxyService {
    public async getQwbWordVariants(qwbWordId: number): Promise<QwbWordVariantListDTO> {
        const response = await CommHelper.get<QwbWordVariantListDTO>(ApiRoutes.qwbWordVariantUrl(qwbWordId));
        return response.data;
    }

    public async getQwbParallelText(qwbStartWordId: number, qwbEndWordId: number): Promise<QwbParallelListDTO> {
        const response = await CommHelper.get<QwbParallelListDTO>(ApiRoutes.qwbParallelTextUrl(qwbStartWordId, qwbEndWordId));
        return response.data;
    }

    public async getQwbBibliography(qwbBibliographyId: number): Promise<QwbBibliographyEntryDTO> {
        const response = await CommHelper.get<QwbBibliographyEntryDTO>(ApiRoutes.qwbBibliographyUrl(qwbBibliographyId));
        return response.data;
    }
}
