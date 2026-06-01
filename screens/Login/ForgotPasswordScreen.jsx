import { Modal, ActivityIndicator, Pressable, StyleSheet, Dimensions, View, Image, StatusBar, Keyboard } from 'react-native';

import {Text, TextInput} from '../../helpers/AppText.jsx';
import { useContext, useState } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { assets } from '../../assets.js';
import axios from 'axios';
import { Context } from '../../context/Context.js';
import { showMessage } from 'react-native-flash-message';

const wwidth = Dimensions.get('screen').width;
const wheight = Dimensions.get('screen').height;

export default function ForgotPasswordScreen({ navigation }){
  const insets = useSafeAreaInsets();
  const { url } = useContext(Context);
  
  const [errors, setErrors] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    email: "",
    newPassword: "",
    verifPassword: "",
  });

  const [verifyMail, setVerifyMail] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);

  const onChangeHandler = (name, value) => {
    setData((prev) => ({...prev, [name]: value}));
  };


  const handleSubmit = async () => {
    Keyboard.dismiss();
    setLoading(true);
    setErrors('');

    if(!data.email || !data.newPassword || !data.verifPassword){
        setErrors("Te rugăm să completezi toate câmpurile.");
        setLoading(false);
        return;
    }
    
    if(data.newPassword !== data.verifPassword){
        setErrors("Parolele nu coincid.");
        setLoading(false);
        return;
    }

    if(data.newPassword.length < 8) {
        setErrors("Parola trebuie să aibă cel puțin 8 caractere.");
        setLoading(false);
        return;
    }

    try{
      const response = await axios.post(`${url}/api/user/forgotpassword`, { email: data.email });
      
      if(response.data.success){
        setOtp('');
        setOtpError('');
        setVerifyMail(true);
      }else{
        setErrors(response.data.message);
      }
    }catch(er){
      if (er.response && er.response.status === 429) {
        setErrors(er.response.data.message || "Prea multe încercări. Încearcă mai târziu.");
      } else {
          console.log(er);
          showMessage({type: "danger", message: "A apărut o eroare. Vă rugăm să încercați din nou mai târziu."})
      }
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
        setOtpError("Codul trebuie să aibă 6 cifre.");
        return;
    }
    
    Keyboard.dismiss();
    setOtpLoading(true);
    setOtpError('');

    try {
        const response = await axios.post(`${url}/api/user/reset-password`, {
            email: data.email,
            otp: otp,
            newPassword: data.newPassword 
        });

        if (response.data.success) {
            showMessage({ message: "Succes!", description: "Parola a fost schimbată cu succes.", type: "success" });
            setVerifyMail(false);
            navigation.navigate('LoginScreen');
        } else {
            setOtpError(response.data.message);
        }
    } catch (er) {
        setOtpError("A apărut o eroare la verificarea codului.");
    }
    setOtpLoading(false);
  };


  return(
    <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

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
           extraHeight={150}
           keyboardShouldPersistTaps='handled'
           keyboardDismissMode='on-drag'
           showsVerticalScrollIndicator={false}
         >
         
          <View style={styles.headerSection}>
            <Text style={styles.headerTitle}>Resetare parolă</Text>
            <Text style={styles.headerSubtitle}>Introdu datele pentru a începe</Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={data.email}
                  onChangeText={(val) => onChangeHandler('email', val)}
                  style={styles.inputBox}
                  maxLength={52}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Introdu adresa de email"
                  placeholderTextColor="#A0A0A0"
                  letterSpacing={0}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Parolă nouă</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    value={data.newPassword}
                    onChangeText={(val) => onChangeHandler('newPassword', val)}
                    style={styles.passwordInput}
                    maxLength={32}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    placeholder="Creează o nouă parolă"
                    placeholderTextColor="#A0A0A0"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIconContainer}>
                    <Image source={assets.view_icon} style={[styles.eyeIcon, showPassword && { opacity: 0.5 }]} />
                  </Pressable>
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirmă parola</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    value={data.verifPassword}
                    onChangeText={(val) => onChangeHandler('verifPassword', val)}
                    style={styles.passwordInput}
                    maxLength={32}
                    secureTextEntry={!showVerifyPassword}
                    autoCapitalize="none"
                    placeholder="Confirmă noua parolă"
                    placeholderTextColor="#A0A0A0"
                  />
                  <Pressable onPress={() => setShowVerifyPassword(!showVerifyPassword)} style={styles.eyeIconContainer}>
                    <Image source={assets.view_icon} style={[styles.eyeIcon, showVerifyPassword && { opacity: 0.5 }]} />
                  </Pressable>
                </View>
            </View>
          </View>

          <View style={styles.errorContainer}>
            { errors ? <Text style={styles.errorText}>{errors}</Text> : null }
          </View>

          <Pressable onPress={() => loading ? null : handleSubmit()} style={({pressed}) => [
                styles.button,
                pressed && styles.buttonPressed
            ]}>
            {loading ? <ActivityIndicator size='small' color='#FFFFFF'/> 
            : <Text style={styles.buttonText}>RESETARE</Text>}
          </Pressable>

          <View style={styles.footerBranding}>
              <Text style={styles.brandTextSmall}>Powered by</Text>
              <Text style={styles.brandTextLarge}>CAR FLIP</Text>
          </View>

          {verifyMail && (
            <Modal transparent={true} visible={verifyMail} animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                  <Text style={styles.modalTitle}>Verifică-ți emailul</Text>
                  <Text style={styles.modalSubtitle}>Am trimis un cod de 6 cifre pe adresa ta. Introdu-l mai jos pentru a schimba parola.</Text>
                  
                  <TextInput
                      value={otp}
                      onChangeText={setOtp}
                      style={styles.otpInput}
                      keyboardType="number-pad"
                      maxLength={6}
                      placeholder="123456"
                      placeholderTextColor="#D1D1D6"
                      textAlign="center"
                  />

                  <View style={styles.modalErrorContainer}>
                      {otpError ? <Text style={styles.modalErrorText}>{otpError}</Text> : null}
                  </View>

                  <Pressable onPress={() => otpLoading ? null : handleVerifyOtp()} style={({ pressed }) => [styles.modalVerifyButton, pressed && styles.buttonPressed]}>
                      {otpLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalVerifyButtonText}>Verifică și Schimbă</Text>}
                  </Pressable>

                  <View style={styles.modalFooter}>
                    <Pressable onPress={() => setVerifyMail(false)} style={styles.modalButton}>
                      <Text style={styles.modalFooterText}>Închide și revino mai târziu</Text>
                    </Pressable>
                  </View>

                </View>
              </View>
            </Modal>
          )}

         </KeyboardAwareScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container:{
      flex:1,
      backgroundColor: '#FFFFFF',
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
        width: 26,
        height: 26,
        resizeMode: 'contain',
        tintColor: '#081539', 
    },
    scrollView: {
        flex: 1,
        marginTop: -59,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 30,
        justifyContent: 'center',
    },
    headerSection: {
        marginBottom: 40,
        alignItems: 'center', 
    },
    headerTitle: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#081539',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
    },
    formSection: {
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label:{
      color: '#081539',
      fontSize: 14,
      fontWeight:'600',
      marginBottom: 8,
      marginLeft: 4,
    },
    inputBox:{
      backgroundColor: '#F5F7FA',
      borderWidth: 1.5,
      borderColor: '#E1E5EB',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      color: '#081539',
      height: 56,
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F5F7FA',
      borderWidth: 1.5,
      borderColor: '#E1E5EB',
      borderRadius: 12,
      height: 56,
    },
    passwordInput: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      color: '#081539',
    },
    eyeIconContainer: {
      padding: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    eyeIcon: {
      width: 20,
      height: 20,
      resizeMode: 'contain',
      tintColor: '#A0A0A0',
    },
    errorContainer: {
        minHeight: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    errorText:{
      color: '#800000',
      fontSize:14,
      fontWeight:'500',
      textAlign: 'center',
    },
    button:{
      backgroundColor: '#081539',
      width: '100%',
      height: 56,
      borderRadius: 16,
      alignItems:'center',
      justifyContent:'center',
      shadowColor: "#081539",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 8,
    },
    buttonPressed: {
        opacity: 0.9,
        transform: [{scale: 0.98}]
    },
    buttonText:{
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight:'bold',
      letterSpacing: 1,
    },
    footerBranding:{
      alignItems:'center',
      marginTop: 20,
      opacity: 0.7,
    },
    brandTextSmall:{
      fontSize: 12,
      color:'#666666',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    brandTextLarge:{
      fontSize: 20,
      fontWeight: '800',
      color:'#081539',
      letterSpacing: 1.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(8, 21, 57, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalContainer:{
      width: '90%',
      backgroundColor:'#FFFFFF',
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 10,
    },
    modalTitle:{
      fontSize: 20,
      fontWeight: 'bold',
      color: '#081539',
      marginBottom: 10,
      textAlign: 'center',
    },
    modalSubtitle:{
      fontSize: 14,
      color:'#666666',
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    otpInput: {
      backgroundColor: '#F5F7FA',
      borderWidth: 1.5,
      borderColor: '#081539',
      borderRadius: 16,
      width: '80%',
      height: 60,
      fontSize: 28,
      fontWeight: 'bold',
      color: '#081539',
      letterSpacing: 8,
      marginBottom: 8,
    },
    modalErrorContainer: {
        minHeight: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalErrorText:{
      color: '#800000',
      fontSize: 14,
      fontWeight:'600',
    },
    modalVerifyButton: {
        backgroundColor: '#081539',
        width: '100%',
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalVerifyButtonText:{
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight:'bold',
    },
    modalFooter: {
        alignItems: 'center',
        width: '100%',
    },
    modalFooterText: {
        fontSize: 14,
        color: '#666666',
        textDecorationLine: 'underline',
    },
    modalButton: {
        paddingVertical: 8,
    }
});