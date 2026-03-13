import * as Keychain from 'react-native-keychain';


export const getCreds = async() => {
    const credentials = await Keychain.getGenericPassword();
    if(credentials)
        return JSON.parse(credentials.password);
    else
        return null;
};

export const setCreds = async(data)=> {
  await Keychain.setGenericPassword(
    'auth',
    JSON.stringify(data)
  );
};

export const resetCreds = async () => {
  await Keychain.resetGenericPassword();
};
