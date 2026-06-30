// 프로필/게시글 이미지를 base64로 저장하므로 업로드 전에 적당한 크기로 압축합니다.
export const resizeImageFile = (file, maxSize = 720, quality = 0.78) => new Promise((resolve, reject) => {
  if (!file) {
    resolve('');
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'));
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => reject(new Error('이미지를 처리하지 못했습니다.'));
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});
