import type { Order } from '../../types/domain';

export type OrderDto = Record<string, unknown>;

export function mapOrderDtoToModel(_dto: OrderDto): Order {
  throw new Error('Not implemented: mapOrderDtoToModel');
}
