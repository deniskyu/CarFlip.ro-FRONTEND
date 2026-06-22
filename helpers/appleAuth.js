import { appleAuth } from '@invertase/react-native-apple-authentication';

export async function signInWithApple() {
  if (!appleAuth.isSupported) return null;

  try {
    const response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
    });

    const { identityToken, fullName, authorizationCode } = response;
    if (!identityToken) throw new Error('NO_IDENTITY_TOKEN');

    return { identityToken, fullName, authorizationCode };
  } catch (e) {
    if (e?.code === appleAuth.Error.CANCELED) return null;
    throw e;
  }
}