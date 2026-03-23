import RNBlobUtil from 'react-native-blob-util';

const generateUniqueFilename = (originalName, mimeType) => {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);

    let ext = '';
    if (originalName) {
        const dotIndex = originalName.lastIndexOf('.');
        if (dotIndex !== -1) {
            ext = originalName.substring(dotIndex).toLowerCase();
        }
    }

    if (!ext) {
        if (mimeType?.includes('video')) ext = '.mp4';
        else if (mimeType?.includes('png')) ext = '.png';
        else if (mimeType?.includes('webp')) ext = '.webp';
        else if (mimeType?.includes('heic') || mimeType?.includes('heif')) ext = '.heic';
        else ext = '.jpg';
    }

    return `carflip_${timestamp}_${random}${ext}`;
};

export const normalizeMediaUri = async (file) => {
    const uri = file.uri;
    if (!uri) return null;

    const destFilename = generateUniqueFilename(file.fileName, file.type);
    const destPath = `${RNBlobUtil.fs.dirs.CacheDir}/${destFilename}`;

    try {
        let sourcePath = uri;

        if (sourcePath.startsWith('file://')) {
            sourcePath = sourcePath.replace('file://', '');
        }

        if (uri.startsWith('content://')) {
            const base64Data = await RNBlobUtil.fs.readFile(uri, 'base64');
            await RNBlobUtil.fs.writeFile(destPath, base64Data, 'base64');
        } else {
            await RNBlobUtil.fs.cp(sourcePath, destPath);
        }

        const exists = await RNBlobUtil.fs.exists(destPath);
        if (!exists) return null;

        return {
            ...file,
            uri: `file://${destPath}`,
            fileName: file.fileName || destFilename,
        };
    } catch (error) {
        console.warn('normalizeMediaUri failed:', error.message);
        try {
            await RNBlobUtil.fs.unlink(destPath);
        } catch (_) {}
        return null;
    }
};