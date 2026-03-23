import type { Payment } from '../../types/domain';

export type PaymentDto = Record<string, unknown>;

export function mapPaymentDtoToModel(_dto: PaymentDto): Payment {
  throw new Error('Not implemented: mapPaymentDtoToModel');
}
