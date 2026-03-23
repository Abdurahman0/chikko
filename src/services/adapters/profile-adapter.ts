import type { AppUser } from '../../types/domain';

export type ProfileDto = Record<string, unknown>;

export function mapProfileDtoToModel(_dto: ProfileDto): AppUser {
  throw new Error('Not implemented: mapProfileDtoToModel');
}
