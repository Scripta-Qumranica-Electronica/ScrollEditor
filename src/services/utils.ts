import { CommHelper } from './comm-helper';
import { Polygon } from '@/utils/Polygons';
import { WktPolygonDTO } from '@/dtos/sqe-dtos';
import { ApiRoutes } from './api-routes';

export default class UtilsService {
    public async repairPolygon(p: Polygon): Promise<Polygon> {
        const url = ApiRoutes.repairPolygonUrl();
        const dto: WktPolygonDTO = {
            wktPolygon: p.wkt,
        };

        const response = await CommHelper.post<WktPolygonDTO>(url, dto);
        return Polygon.fromWkt(response.data.wktPolygon);
    }
}
