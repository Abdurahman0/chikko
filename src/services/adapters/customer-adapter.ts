import type { Customer } from '../../types/domain';

export type CustomerDto = Record<string, unknown>;

export function mapCustomerDtoToModel(_dto: CustomerDto): Customer {
  throw new Error('Not implemented: mapCustomerDtoToModel');
}
