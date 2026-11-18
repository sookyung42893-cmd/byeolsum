/**
 * 사진을 브라우저 저장소(localStorage)에 넣을 수 있게 작게 줄여 data URL로 만든다.
 * 긴 변을 maxSide 픽셀로 맞추고 JPEG로 압축한다 (보통 40~120KB).
 */
export function compressImage(file: File, maxSide = 720, quality = 0.62): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('사진 파일만 올릴 수 있어.'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('사진을 읽지 못했어.'));
        return;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('사진을 읽지 못했어. 다른 사진으로 해볼래?'));
    };
    img.src = url;
  });
}
