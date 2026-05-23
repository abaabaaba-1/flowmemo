const MAX_IMAGE_EDGE = 1280;
const JPEG_QUALITY = 0.78;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("无法读取图片"));
    image.src = src;
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}

export async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  return dataUrl.split(",")[1] ?? dataUrl;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta = "", payload = ""] = dataUrl.split(",");
  const mimeType = meta.match(/^data:([^;]+);base64$/)?.[1] ?? "image/jpeg";
  const bytes = atob(payload);
  const array = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    array[index] = bytes.charCodeAt(index);
  }
  return new Blob([array], { type: mimeType });
}

export async function compressImageToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择图片文件");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("图片不能超过 8MB");
  }

  const originalUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalUrl);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器无法处理图片");
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}
