import {
  MOCK_FIRST_NAMES,
  MOCK_LAST_NAMES,
} from './catalogs';

const MOCK_BASE_DATE = new Date();

export function createMockId(prefix: string, index: number): string {
  return `${prefix}-${String(index + 1).padStart(3, '0')}`;
}

export function cycleValue<T>(
  values: readonly T[],
  index: number,
  offset = 0,
): T {
  return values[(index + offset) % values.length]!;
}

export function pickMany<T>(
  values: readonly T[],
  startIndex: number,
  count: number,
): T[] {
  return Array.from({ length: count }, (_, index) =>
    cycleValue(values, startIndex + index),
  );
}

export function numberInRange(
  index: number,
  min: number,
  max: number,
  step = 1,
): number {
  const steps = Math.floor((max - min) / step) + 1;
  return min + ((index % steps) * step);
}

export function moneyValue(
  index: number,
  min: number,
  max: number,
  step = 5,
): number {
  return Number(numberInRange(index, min, max, step).toFixed(2));
}

export function timestampFromIndex(
  index: number,
  options?: {
    dayStep?: number;
    hourOffset?: number;
    minuteOffset?: number;
  },
): string {
  const date = new Date(MOCK_BASE_DATE);
  date.setUTCDate(date.getUTCDate() - (index * (options?.dayStep ?? 1)));
  date.setUTCHours(
    date.getUTCHours() - (options?.hourOffset ?? 0),
    date.getUTCMinutes() - (options?.minuteOffset ?? 0),
  );
  return date.toISOString();
}

export function createPhoneNumber(index: number): string {
  return `+998 90 ${String(1000000 + (index * 7313)).slice(0, 7)}`;
}

export function createPersonName(index: number): {
  firstName: string;
  lastName: string;
  fullName: string;
} {
  const firstName = cycleValue(MOCK_FIRST_NAMES, index);
  const lastName = cycleValue(MOCK_LAST_NAMES, index, index % 3);
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
  };
}

export function createUsername(index: number): string {
  const { firstName, lastName } = createPersonName(index);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index + 1}`;
}

export function createEmail(index: number): string {
  return `${createUsername(index)}@chikko.test`;
}
