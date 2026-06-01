import { Keyboard, Modal, ActivityIndicator, Pressable, Switch, StyleSheet, View, Platform, Image, StatusBar } from 'react-native';

import {Text, TextInput} from '../../helpers/AppText.jsx';
import { useState, useContext } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Context } from '../../context/Context.js';
import axios from 'axios';
import { showMessage } from 'react-native-flash-message';
import { assets } from '../../assets.js';

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { url } = useContext(Context);
  
  const [errors, setErrors] = useState('');
  const [loading, setLoading] = useState(false);

  const [verifyMail, setVerifyMail] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);

  const [data, setData] = useState({
    username: '',
    email: '',
    password: '',
    verifyPassword: '',
    terms: false,
  });

  const onChangeHandler = (name, value) => {
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const signUp = async () => {
    Keyboard.dismiss();
    setLoading(true);
    setErrors('');

    if (!data.terms) {
      setErrors('Termenii si conditiile trebuie aprobate.');
      setLoading(false);
      return;
    }
    if (data.password !== data.verifyPassword) {
      setErrors('Parolele sunt diferite.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${url}/api/user/register`, data);
      if (response.data.success) {
        setVerifyMail(true); // Deschidem modalul
      }else{
        setErrors(response.data.message);
      }
    } catch (er) {
      if (er.response?.status === 429) {
        setVerifyMail(true); 
        setOtpError("Folosește codul trimis anterior sau așteaptă 1 minut pentru unul nou.");
      } else {
        const errorMessage = er.response?.data?.message || 'Eroare la server.';
        setErrors(errorMessage);
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
        const response = await axios.post(`${url}/api/user/verify-otp`, {
            email: data.email,
            otp: otp
        });

        if (response.data.success) {
            showMessage({ message: "Succes!", description: "Contul a fost activat cu succes.", type: "success" });
            setVerifyMail(false);
            navigation.navigate('LoginScreen');
        } else{
          setOtpError(response.data.message);
        }
    } catch (er) {
        // Prindem mesajele cu numărul de încercări rămase, erori de expirare, etc.
        const errorMessage = er.response?.data?.message || "A apărut o eroare la verificarea codului.";
        setOtpError(errorMessage);
    }
    setOtpLoading(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <View style={[styles.absoluteHeader, { top: insets.top + 10 }]}>
        <Pressable 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          hitSlop={20}
        >
          <Image source={assets.back_arrow} style={styles.backIcon} />
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
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Creează cont</Text>
          <Text style={styles.headerSubtitle}>Completează datele pentru a te înregistra.</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nume de utilizator</Text>
            <TextInput
              onChangeText={(val) => onChangeHandler('username', val)}
              value={data.username}
              style={styles.input}
              maxLength={16}
              placeholder="Introdu numele de utilizator"
              placeholderTextColor="#A0A0A0"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              onChangeText={(val) => onChangeHandler('email', val)}
              value={data.email}
              style={styles.input}
              maxLength={52}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Introdu adresa de email"
              placeholderTextColor="#A0A0A0"
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
                placeholder="Creează o parolă"
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
                onChangeText={(val) => onChangeHandler('verifyPassword', val)}
                value={data.verifyPassword}
                style={styles.passwordInput}
                secureTextEntry={!showVerifyPassword}
                maxLength={32}
                placeholder="Confirmă parola"
                placeholderTextColor="#A0A0A0"
              />
              <Pressable onPress={() => setShowVerifyPassword(!showVerifyPassword)} style={styles.eyeIconContainer}>
                <Image source={assets.view_icon} style={[styles.eyeIcon, showVerifyPassword && { opacity: 0.5 }]} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.termsContainer}>
          <View style={styles.termsTextContainer}>
            <Text style={styles.termText}>Sunt de acord cu </Text>
            <Pressable onPress={() => navigation.navigate('LegalScreen', { showBack: true })}><Text style={styles.termLink}>termenii și condițiile</Text></Pressable>
          </View>
          <Switch
            value={data.terms}
            onValueChange={(val) => onChangeHandler('terms', val)}
            trackColor={{ false: '#D1D1D6', true: '#081539' }}
            thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (data.terms ? '#800000' : '#f4f3f4')}
            ios_backgroundColor="#D1D1D6"
          />
        </View>

        <View style={styles.errorContainer}>
          {errors ? <Text style={styles.errorText}>{errors}</Text> : null}
        </View>

        <Pressable onPress={() => loading ? null : signUp()} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          {loading ? <ActivityIndicator size='small' color='#FFFFFF' /> : <Text style={styles.buttonText}>Înregistrare</Text>}
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
                <Text style={styles.modalSubtitle}>Am trimis un cod de 6 cifre la adresa ta. Dacă nu vezi niciun cod în inbox, te rugăm verifică secțiunea de spam, cu siguranță îl găsești acolo.</Text>
                
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
                    {otpLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalVerifyButtonText}>Verifică Codul</Text>}
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginTop: 6,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  headerContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#081539',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 6,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#081539',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E1E5EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#081539',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E1E5EB',
    borderRadius: 12,
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: -14,
    marginTop: -8,
  },
  termsTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  termText: {
    fontSize: 14,
    color: '#666666',
  },
  termLink: {
    fontSize: 14,
    color: '#081539',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  errorContainer: {
    minHeight: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8
  },
  errorText: {
    color: '#800000',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginVertical: 4,
    marginTop: 8,
  },
  button: {
    backgroundColor: '#800000',
    width: '100%',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: "#800000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    marginTop: -8
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }]
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerBranding: {
    alignItems: 'center',
    marginTop: 14,
    opacity: 0.7,
  },
  brandTextSmall: {
    fontSize: 12,
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  brandTextLarge: {
    fontSize: 20,
    fontWeight: '800',
    color: '#081539',
    letterSpacing: 1.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 21, 57, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#081539',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#800000',
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
  modalErrorText: {
    color: '#800000',
    fontSize: 14,
    fontWeight: '600',
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
  modalVerifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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