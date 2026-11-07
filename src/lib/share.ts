import { Linking, Share } from 'react-native';

/** פותח וואטסאפ עם ההודעה; אם אין וואטסאפ – חלונית שיתוף רגילה */
export async function sendToWhatsApp(text: string) {
  try {
    await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(text)}`);
  } catch {
    await Share.share({ message: text });
  }
}

export async function shareText(text: string) {
  await Share.share({ message: text });
}
