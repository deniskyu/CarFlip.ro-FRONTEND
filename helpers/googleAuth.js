import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { assets } from '../assets.js';

GoogleSignin.configure({
  webClientId: assets.GOOGLE_WEB_CLIENT_ID,
  iosClientId: assets.IOS_CLIENT_ID,
});

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (isSuccessResponse(response)) {
    const idToken = response.data?.idToken;
    if (!idToken) throw new Error('NO_ID_TOKEN');
    return idToken;
  }
  return null;
}

export async function signOutGoogle() {
  try {
    await GoogleSignin.signOut();
  } catch (e) {}
}