export function createNotImplementedError(
  serviceName: string,
  methodName: string,
): Error {
  return new Error(`Not implemented: ${serviceName}.${methodName}`);
}
