import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** שומר קובץ זמני ופותח את חלונית השיתוף (וואטסאפ, מייל, דרייב...) */
export async function shareFile(name: string, content: Uint8Array | string, mimeType: string) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
}

/** בחירת קובץ גיבוי מהטלפון. מחזיר את התוכן או null אם בוטל */
export async function pickTextFile(): Promise<string | null> {
  const res = await File.pickFileAsync();
  if (res.canceled) return null;
  const picked = Array.isArray(res.result) ? res.result[0] : res.result;
  return picked.textSync();
}
