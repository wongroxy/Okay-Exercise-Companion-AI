export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix e.g. "data:image/png;base64,"
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
};

/**
 * Converts a data URL string into a File object.
 * @param dataUrl The data URL to convert.
 * @param filename The desired filename for the output File.
 * @returns A File object.
 */
export const dataUrlToFile = (dataUrl: string, filename: string): File => {
  const arr = dataUrl.split(',');
  if (arr.length < 2) {
    throw new Error('Invalid data URL');
  }
  
  // Use a more robust regex to capture the MIME type, handling the optional ";base64" string.
  const mimeMatch = arr[0].match(/^data:(.*?)(;base64)?$/);
  if (!mimeMatch || mimeMatch.length < 2) {
    throw new Error('Could not determine MIME type from data URL');
  }
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};