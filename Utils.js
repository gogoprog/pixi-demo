/**
 * verify if it's in debug mode
 * @returns if we are in debug mode
 */
export function isDebugMode() {
    return process && process.env && process.env.NODE_ENV && process.env.NODE_ENV === 'development';
}

