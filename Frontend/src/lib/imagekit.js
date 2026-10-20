export async function uploadImage(file) {
  const endpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT;
  if (!endpoint || !file) return "";
  const form = new FormData();
  form.append("file", file);
  form.append("fileName", file.name);
  form.append("publicKey", import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || "");
  const res = await fetch(`${endpoint}/api/v1/files/upload`, {
    method: "POST",
    body: form
  });
  if (!res.ok) return "";
  const data = await res.json();
  return data.url || "";
}
