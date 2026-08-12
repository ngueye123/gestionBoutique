export function getApiErrorMessage(result: any, defaultMessage: string): string {
  if (result?.message) {
    return result.message;
  }

  if (result?.errors && typeof result.errors === 'object') {
    const firstError = Object.values(result.errors).find((value) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return Boolean(value);
    });

    if (Array.isArray(firstError)) {
      return String(firstError[0]);
    }

    if (typeof firstError === 'string') {
      return firstError;
    }
  }

  return defaultMessage;
}
