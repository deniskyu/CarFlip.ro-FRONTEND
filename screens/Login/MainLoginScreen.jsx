import { SafeAreaView, Platform, Dimensions, Pressable, View, StyleSheet, StatusBar, Image, ActivityIndicator } from 'react-native';
import {Text, TextInput} from '../../helpers/AppText.jsx';
import { useContext, useState } from 'react';
import { assets } from '../../assets.js';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Context } from '../../context/Context.js';
import { showMessage } from 'react-native-flash-message';
import axios from 'axios';
import { getFcmToken } from '../../helpers/notificationHelper.js';
import { signInWithGoogle } from '../../helpers/googleAuth.js';
import { statusCodes, isErrorWithCode } from '@react-native-google-signin/google-signin';
import { signInWithApple } from '../../helpers/appleAuth.js';
import { appleAuth } from '@invertase/react-native-apple-authentication';

const wwidth = Dimensions.get('window').width;
const wheight = Dimensions.get('window').height;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const btnTextSize = clamp(wwidth / 24, 14, 18);
const btnIconSize = clamp(wwidth / 15, 22, 34);

export default function MainLoginScreen({navigation}){
  const insets = useSafeAreaInsets();
  const { url, logInContext } = useContext(Context);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGoogle();
      if (!idToken) return;

      const fcmToken = await getFcmToken();

      const response = await axios.post(`${url}/api/user/google-auth`, { idToken, fcmToken });

      if (response.data.success) {
        const { newAccessToken, newRefreshToken, username } = response.data;
        await logInContext(newAccessToken, newRefreshToken, username);
      } else {
        showMessage({ message: "Eroare", description: response.data.message || "Autentificare eșuată.", type: "danger" });
      }
    } catch (err) {
      if (isErrorWithCode(err) && (err.code === statusCodes.IN_PROGRESS || err.code === statusCodes.SIGN_IN_CANCELLED)) return;

      if (err.response?.status === 429) {
        showMessage({ message: "Prea multe încercări", description: "Te rugăm încearcă mai târziu.", type: "danger" });
      } else if (isErrorWithCode(err) && err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showMessage({ message: "Google Play indisponibil", description: "Actualizează Google Play Services și încearcă din nou.", type: "danger" });
      } else {
        showMessage({ message: "Eroare", description: "Conectarea cu Google a eșuat. Încearcă din nou.", type: "danger" });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setAppleLoading(true);
    try {
      const result = await signInWithApple();
      if (!result) return;

      const fcmToken = await getFcmToken();

      const response = await axios.post(`${url}/api/user/apple-auth`, {
        identityToken: result.identityToken,
        fullName: result.fullName,
        authorizationCode: result.authorizationCode,
        fcmToken,
      });

      if (response.data.success) {
        const { newAccessToken, newRefreshToken, username } = response.data;
        await logInContext(newAccessToken, newRefreshToken, username);
      } else {
        showMessage({ message: "Eroare", description: response.data.message || "Autentificare eșuată.", type: "danger" });
      }
    } catch (err) {
      if (err.response?.status === 429) {
        showMessage({ message: "Prea multe încercări", description: "Te rugăm încearcă mai târziu.", type: "danger" });
      } else {
        showMessage({ message: "Eroare", description: "Conectarea cu Apple a eșuat. Încearcă din nou.", type: "danger" });
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return(
    <View style={styles.container}>
       <StatusBar hidden/>
       <View style={{ position: 'absolute', top: insets.top + 10, left: 24, zIndex: 10 }}>
           <Pressable onPress={() => navigation.goBack()} hitSlop={20} style={{ padding: 5 }}>
               <Image source={assets.back_arrow} style={{ width: 28, height: 28, resizeMode: 'contain', tintColor: '#081539' }} />
           </Pressable>
       </View>
       <SafeAreaView style={styles.safe}>
            <View style={styles.middleSection}>
                <Image
                  source={assets.logo}
                  style={styles.carImage}
                  resizeMode="contain"
                />
            </View>
            <View style={styles.bottomSection}>
                <View style={styles.buttonContainer}>
                <Pressable onPress={() => navigation.navigate('LoginScreen')}>
                    <View style={styles.button}>
                    <Text style={styles.buttonText}>Intră în cont</Text>
                    </View>
                </Pressable>
                </View>
                <View style={styles.buttonContainer}>
                <Pressable onPress={() => navigation.navigate('RegisterScreen')}>
                    <View style={[styles.button, {backgroundColor:'#800000'}]}>
                    <Text style={styles.buttonText}>Creează cont</Text>
                    </View>
                </Pressable>
                </View>

                {Platform.OS === 'ios' && appleAuth.isSupported && (
                  <View style={styles.buttonContainer}>
                    <Pressable onPress={() => appleLoading ? null : handleAppleLogin()}>
                      <View style={styles.appleButton}>
                        {appleLoading
                          ? <ActivityIndicator size="small" color="#FFFFFF" />
                          : (
                            <View style={styles.btnInner}>
                              <Text style={styles.appleButtonText}>Continuă cu Apple</Text>
                              <Image source={assets.apple_icon} style={styles.btnIcon} resizeMode="contain" />
                            </View>
                          )}
                      </View>
                    </Pressable>
                  </View>
                )}

                <View style={styles.buttonContainer}>
                <Pressable onPress={() => googleLoading ? null : handleGoogleLogin()}>
                    <View style={styles.googleButton}>
                    {googleLoading
                      ? <ActivityIndicator size="small" color="#081539" />
                      : (
                        <View style={styles.btnInner}>
                          <Text style={styles.googleButtonText}>Continuă cu Google</Text>
                          <Image source={assets.google_icon} style={styles.btnIcon} resizeMode="contain" />
                        </View>
                      )}
                    </View>
                </Pressable>
                </View>
            </View>
       </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fefefe',
    },
    safe:{
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: wwidth/14,
    },
    middleSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        borderRadius: '50%',
    },
    carImage: {
        width: '55%',
        height: '55%',
    },
    bottomSection: {
        paddingBottom: wheight/20,
        alignItems: 'center',
    },
    button:{
        backgroundColor: '#081539',
        width: wwidth/1.1,
        height: wheight/14,
        borderRadius:22,
        alignSelf:'center',
        alignItems:'center',
        justifyContent:'center',
        marginTop: 15,
      },
    buttonText:{
        color: '#fff',
        fontSize:17,
        fontWeight:'bold',
    },
    btnInner:{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnIcon:{
        width: btnIconSize,
        height: btnIconSize,
        marginLeft: 8,
    },
    appleButton:{
        backgroundColor: '#000000',
        width: wwidth/1.1,
        height: wheight/14,
        borderRadius:22,
        alignSelf:'center',
        alignItems:'center',
        justifyContent:'center',
        marginTop: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 5,
        elevation: 4,
      },
    appleButtonText:{
        color: '#FFFFFF',
        fontSize: btnTextSize,
        fontWeight: '600',
      },
    googleButton:{
        backgroundColor: '#FFFFFF',
        width: wwidth/1.1,
        height: wheight/14,
        borderRadius:22,
        alignSelf:'center',
        alignItems:'center',
        justifyContent:'center',
        marginTop: 15,
        borderWidth: 1,
        borderColor: '#DADCE0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.10,
        shadowRadius: 5,
        elevation: 3,
      },
    googleButtonText:{
        color: '#081539',
        fontSize: btnTextSize,
        fontWeight: '600',
      },
    buttonContainer:{
        alignItems:'center',
    },
});