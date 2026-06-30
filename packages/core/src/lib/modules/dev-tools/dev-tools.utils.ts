export const toConstCase = (str: string): string => {
    if (!str) return '';
    return str
        .replace(/([a-z\d])([A-Z])/g, '$1_$2')
        .replace(/[-\s]+/g, '_')
        .toUpperCase();
};

export const keyToLabel = (str: string): string => {
    if (!str) return '';
    const spaced = str.replace(/([A-Z])/g, ' $1').trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};