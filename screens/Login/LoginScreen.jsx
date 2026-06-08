import {ActivityIndicator, Dimensions, StatusBar, StyleSheet, View, Pressable, Image, Platform, Keyboard} from 'react-native';
import {Text, TextInput} from '../../helpers/AppText.jsx';
import {useContext, useState} from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showMessage } from 'react-native-flash-message';
import { Context } from '../../context/Context.js';
import axios from 'axios';
import { assets } from '../../assets.js';
import {setCreds} from '../../helpers/keychainFunctions.js';

import { getFcmToken } from '../../helpers/notificationHelper.js';

export default function LoginScreen({ navigation }){
  const insets = useSafeAreaInsets();
  const {url, logInContext} = useContext(Context);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState('');
  const [data, setData] = useState({
    email: '',
    password: '',
  });

  const onChangeHandler = (name, value) => {
    setData((prev) => ({...prev, [name]: value}));
  };

  const logIn = async () => {
    Keyboard.dismiss();
    setLoading(true);
    setErrors('');
    
    try {
        const fcmToken = await getFcmToken();
        console.log("FCM Token la Login:", fcmToken);

        const loginPayload = {
            ...data,
            fcmToken: fcmToken
        };

        const response = await axios.post(`${url}/api/user/login`, loginPayload);
        
        if(response.data.success) {
          const { newAccessToken, newRefreshToken } = response.data;
          
          await setCreds({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
          });

          showMessage({
            message: "Succes",
            description: response.data.message,
            type: "success",
            icon: "success"
          });
          
          await logInContext(newAccessToken, newRefreshToken, response.data.username)
          
        } else {
            setErrors(response.data.message);
        }
    } catch(er) {
        if (er.response && er.response.status === 429) {
          const errMsg = er.response.data.message || "Prea multe încercări.";
          setErrors(errMsg);
        } else {
          console.log(er);
          showMessage({ message: "Eroare", description: "Încearcă mai târziu", type: "danger" });
        }
    }
    setLoading(false);
  };

  return(
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={[styles.absoluteHeader, { top: insets.top + 10 }]}>
          <Pressable 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
            hitSlop={20}
          >
            <Image 
              source={assets.back_arrow} 
              style={styles.backIcon} 
            />
          </Pressable>
      </View>

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}
        enableOnAndroid={true}
        keyboardShouldPersistTaps='handled'
        keyboardDismissMode='on-drag'
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Bine ai revenit</Text>
          <Text style={styles.headerSubtitle}>Loghează-te pentru a continua</Text>
        </View>

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
             <Text style={styles.label}>Email</Text>
             <TextInput 
              onChangeText={(val) => onChangeHandler('email', val)}
              value={data.email}
              style={styles.inputBox}
              maxLength={52}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Introdu adresa de email"
              placeholderTextColor="rgba(255,255,255,0.5)"
              textContentType="username"
              autoComplete="email"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Parolă</Text>
            <View style={styles.passwordContainer}>
                <TextInput 
                    onChangeText={(val) => onChangeHandler('password', val)}
                    value={data.password}
                    style={styles.passwordInput}
                    secureTextEntry={!showPassword}
                    maxLength={32}
                    placeholder="Introdu parola"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    textContentType="password"
                    autoComplete="password"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIconContainer}>
                    <Image source={assets.view_icon} style={[styles.eyeIcon, showPassword && { opacity: 0.5 }]} />
                </Pressable>
            </View>
        </View>

          <View style={styles.forgotPasswordBox}>
            <Pressable onPress={() => navigation.navigate('ForgotPasswordScreen')}>
              <Text style={styles.forgotPasswordText}>Ai uitat parola?</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.actionSection}>
          <View style={styles.errorContainer}>
            {errors ? <Text style={styles.errorText}>{errors}</Text> : null}
          </View>

          <Pressable onPress={() => loading ? null : logIn()} style={({pressed}) => [
            styles.button,
            pressed && styles.buttonPressed
          ]}>
            {loading ? <ActivityIndicator size='small' color='#800000'/> 
            : <Text style={styles.buttonText}>LOGIN</Text>}
          </Pressable>
        </View>

        <View style={styles.footerBranding}>
            <Text style={styles.brandTextSmall}>Powered by</Text>
            <Text style={styles.brandTextLarge}>CAR FLIP</Text>
        </View>

      </KeyboardAwareScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:{
    flex:1,
    backgroundColor: '#800000',
  },
  absoluteHeader: {
    position: 'absolute',
    left: 24,
    zIndex: 10,
  },
  backButton: {
      padding: 5,
  },
  backIcon: {
      width: 28,
      height: 28,
      resizeMode: 'contain',
      tintColor: '#FFFFFF', 
  },
  scrollView: {
    flex: 1,
    marginTop: -44,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  headerSection: {
    marginBottom: 50,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  headerSubtitle: {
    fontSize: 17.5,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  formSection: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginLeft: 4,
  },
  inputBox:{
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 14,
    height: 60,
    paddingHorizontal: 18,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 0,
  },
  forgotPasswordBox:{
    alignItems:'flex-end',
    marginTop: 8,
  },
  forgotPasswordText:{
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  actionSection: {
    marginTop: 6,
  },
  errorContainer: {
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText:{
    color: '#FFCCCC',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  button:{
    backgroundColor: '#FFFFFF',
    width: '100%',
    height: 62,
    borderRadius: 18,
    alignItems:'center',
    justifyContent:'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    marginTop: -20,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{scale: 0.98}]
  },
  buttonText:{
    color: '#800000',
    fontSize: 20,
    fontWeight:'bold',
    letterSpacing: 1.2,
  },
  footerBranding:{
    alignItems:'center',
    marginTop: 20,
    opacity: 0.9,
    fontSize: 18,
  },
  brandTextSmall:{
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  brandTextLarge:{
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 14,
  },
  passwordInput: {
      flex: 1,
      height: 60,
      paddingHorizontal: 18,
      fontSize: 18,
      color: '#FFFFFF',
  },
  eyeIconContainer: {
      padding: 16,
      justifyContent: 'center',
      alignItems: 'center',
  },
  eyeIcon: {
      width: 20,
      height: 20,
      resizeMode: 'contain',
      tintColor: 'rgba(255,255,255,0.7)',
  },
});