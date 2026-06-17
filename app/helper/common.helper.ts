export const uploadFolderFormat = 'YYYYMMDD'

// Join path segments into one URL, trimming the slashes at each seam so there are no doubles.
// The first segment keeps any leading slash and the last keeps any trailing slash.
const combineURLs = (...urls: string[]): string => {
    if (urls.length === 0) return '';
    return urls.reduce((base, segment) => {
        const left = base.replace(/\/+$/, '');     // strip any trailing slash(es) from the accumulated left side
        const right = segment.replace(/^\/+/, ''); // strip any leading slash(es) from the next segment
        return `${left}/${right}`;                 // rejoin with exactly one slash at the seam
    });
}

/**
 * Normalize a dialed/stored phone number to E.164-ish form: strip a leading '+', then re-add the country code. A
 * 10-digit number is assumed US (+1); anything longer is assumed already international and just gets a '+'.
 * TODO: could normalizeNumber be in zod?
 */
const normalizeNumber = (raw: string): string => {
    const digits = raw.trim().replace('+', '')
    if (digits.length > 10) return `+${digits}`
    if (digits.length === 10) return `+1${digits}`
    return digits
}

export {
    combineURLs, normalizeNumber,
}
