export function extractApiErrorMessage(error: any): string | null {
    if (!error) return null;

    let payload = (error && typeof error === 'object' && 'error' in error && error.error !== undefined)
        ? error.error
        : error;

    if (typeof payload === 'string' && payload.trim() !== '') {
        try {
            const parsed = JSON.parse(payload);
            if (parsed && typeof parsed === 'object') {
                payload = parsed;
            }
        } catch (e) {
            if (!payload.startsWith('Http failure response')) {
                return payload;
            }
        }
    }

    if (!payload || typeof payload !== 'object') {
        if (typeof error.message === 'string' && !error.message.startsWith('Http failure response')) {
            return error.message;
        }
        return null;
    }

    const innerError = (payload.error && typeof payload.error === 'object')
        ? payload.error
        : (payload.data && typeof payload.data === 'object' && payload.data.error)
            ? payload.data.error
            : payload;

    const errorsArray = Array.isArray(innerError.errors)
        ? innerError.errors
        : Array.isArray(payload.errors)
            ? payload.errors
            : null;

    if (errorsArray && errorsArray.length > 0) {
        const listItems: string[] = [];
        errorsArray.forEach((item: any) => {
            if (!item) return;
            if (typeof item === 'string' && item.trim() !== '') {
                listItems.push(`• ${item.trim()}`);
            } else if (typeof item === 'object') {
                const msg = item.message || item.error || item.detail;
                const field = item.field || item.property || item.key;
                if (msg) {
                    if (field) {
                        listItems.push(`• ${field}: ${msg}`);
                    } else {
                        listItems.push(`• ${msg}`);
                    }
                }
            }
        });

        if (listItems.length > 0) {
            const headerMsg = (typeof innerError.message === 'string' && innerError.message.trim() !== '' && !innerError.message.startsWith('Http failure response'))
                ? innerError.message.trim()
                : (typeof payload.message === 'string' && payload.message.trim() !== '' && !payload.message.startsWith('Http failure response'))
                    ? payload.message.trim()
                    : null;

            return headerMsg ? `${headerMsg}\n${listItems.join('\n')}` : listItems.join('\n');
        }
    }

    if (typeof innerError.message === 'string' && innerError.message.trim() !== '' && !innerError.message.startsWith('Http failure response')) {
        return innerError.message.trim();
    }

    if (typeof payload.userMessage === 'string' && payload.userMessage.trim() !== '') {
        return payload.userMessage.trim();
    }

    if (typeof payload.message === 'string' && payload.message.trim() !== '' && !payload.message.startsWith('Http failure response')) {
        return payload.message.trim();
    }

    if (typeof error.userMessage === 'string' && error.userMessage.trim() !== '') {
        return error.userMessage.trim();
    }

    if (typeof error.message === 'string' && error.message.trim() !== '' && !error.message.startsWith('Http failure response')) {
        return error.message.trim();
    }

    return null;
}
