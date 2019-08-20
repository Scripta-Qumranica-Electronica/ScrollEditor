import { Position } from '@/utils/PointerTracker';


export interface ZoomRequestEventArgs {
    amount: number;
    clientPosition: Position; // Position in client coordinates
}
