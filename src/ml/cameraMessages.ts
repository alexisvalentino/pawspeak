function errorName(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('name' in error)) return '';
  return typeof error.name === 'string' ? error.name : '';
}

/** Private-network hosts, e.g. the "Network:" URL printed by `npm run dev`. */
function isLocalNetworkHost(hostname: string): boolean {
  return /^10\./.test(hostname)
    || /^192\.168\./.test(hostname)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    || /\.local$/i.test(hostname);
}

export function cameraApiUnavailableMessage(isSecureContext: boolean, hostname = ''): string {
  if (isSecureContext) return 'This browser does not support camera access. Try a current version of Chrome or Safari, or upload a pet photo.';
  if (isLocalNetworkHost(hostname)) {
    return 'Browsers block the camera on a plain http:// network address. Open PawSpeak over HTTPS (or install the app), or upload a pet photo.';
  }
  return 'Camera access needs a secure address (HTTPS). Open PawSpeak over HTTPS, or upload a pet photo.';
}

export function cameraStartErrorMessage(error: unknown): string {
  switch (errorName(error)) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera access is blocked. Allow PawSpeak to use the camera in browser or device settings, then tap Start camera. You can upload a pet photo instead.';
    case 'NotFoundError':
      return 'PawSpeak could not find a camera on this device. Try another camera or upload a pet photo.';
    case 'NotReadableError':
      return 'The camera could not start because it may be busy. Close other camera apps and try again, or upload a pet photo.';
    case 'OverconstrainedError':
      return 'That camera is not available. Tap Switch camera to try another one, or upload a pet photo.';
    case 'AbortError':
      return 'Camera startup was interrupted. Tap Start camera to try again, or upload a pet photo.';
    default:
      return 'PawSpeak could not start the camera. Check camera access in your device settings, then try again or upload a pet photo.';
  }
}

export function petDetectorErrorMessage(): string {
  return 'The camera is still on, but the pet finder could not start.';
}

/** A short, stack-free diagnostic that can be shared to identify model startup failures. */
export function detectorErrorDetails(error: unknown): string {
  const name = errorName(error);
  const message = typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message
    : '';
  const detail = [name, message].filter(Boolean).join(': ')
    || (typeof error === 'string' ? error : 'Unknown detector error');
  return detail.replace(/\s+/g, ' ').trim().slice(0, 240);
}
