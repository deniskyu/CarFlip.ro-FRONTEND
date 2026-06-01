import { ActivityIndicator, Modal, Pressable, StyleSheet, View, Image, StatusBar, Keyboard } from 'react-native';

import {Text, TextInput} from '../../helpers/AppText.jsx';
import { useState, useContext } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { showMessage } from 'react-native-flash-message';
import { Context } from '../../context/Context.js';
import { assets } from '../../assets.js';
import { getCreds } from '../../helpers/keychainFunctions.js';
import axios from 'axios';
import axiosAuthGuard from '../../helpers/axiosAuthGuard.js';

export default function SecurityScreen() {
    const navigation = useNavigation();
    const { url, logoutContext } = useContext(Context);

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [data, setData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const onChangeHandler = (name, value) => {
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handleChangePassword = async () => {
        Keyboard.dismiss();
        setErrors('');

        if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
            setErrors('Te rugăm să completezi toate câmpurile.');
            return;
        }
        if (data.newPassword !== data.confirmPassword) {
            setErrors('Parolele noi nu coincid.');
            return;
        }
        if (data.newPassword.length < 8) {
            setErrors('Parola nouă trebuie să aibă cel puțin 8 caractere.');
            return;
        }

        setLoading(true);
        try {
            const creds = await getCreds();
            const currentRefreshToken = creds?.refreshToken || null;

            const response = await axiosAuthGuard.put(`${url}/api/user/change-password`, {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
                confirmPassword: data.confirmPassword,
                refreshToken: currentRefreshToken,
            });

            if (response.data.success) {
                showMessage({
                    message: "Succes",
                    description: "Parola a fost schimbată cu succes.",
                    type: "success",
                    icon: "success",
                    duration: 2500,
                });
            } else {
                setErrors(response.data.message);
            }
        } catch (er) {
            setErrors(er.response?.data?.message || 'Eroare la schimbarea parolei.');
        }
        setLoading(false);
    };

    const [deleteModal, setDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const handleDeleteAccount = async () => {
        Keyboard.dismiss();
        setDeleteError('');

        if (!deletePassword) {
            setDeleteError('Introdu parola pentru confirmare.');
            return;
        }

        setDeleteLoading(true);
        try {
            const response = await axiosAuthGuard.delete(`${url}/api/user/delete-account`, {
                data: { password: deletePassword }
            });

            if (response.data.success) {
                setDeleteModal(false);
                showMessage({
                    message: "Cont șters",
                    description: "Toate datele au fost șterse definitiv.",
                    type: "success",
                    duration: 3000,
                });
                setTimeout(() => logoutContext(), 1500);
            } else {
                setDeleteError(response.data.message);
            }
        } catch (er) {
            setDeleteError(er.response?.data?.message || 'Eroare la ștergerea contului.');
        }
        setDeleteLoading(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Securitate</Text>
                <Pressable onPress={() => navigation.openDrawer()} hitSlop={16} style={styles.menuButton}>
                    <View style={styles.menuIconBox}>
                        <View style={styles.menuLine} />
                        <View style={styles.menuLine} />
                        <View style={styles.menuLine} />
                    </View>
                </Pressable>
            </View>

            <KeyboardAwareScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                enableOnAndroid={true}
                extraHeight={120}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
            >

                <Text style={styles.sectionLabel}>Schimbă parola</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Parola curentă</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            value={data.currentPassword}
                            onChangeText={(val) => onChangeHandler('currentPassword', val)}
                            style={styles.passwordInput}
                            secureTextEntry={!showCurrent}
                            maxLength={32}
                            placeholder="Introdu parola actuală"
                            placeholderTextColor="#A0A0A0"
                        />
                        <Pressable onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
                            <Image source={assets.view_icon} style={[styles.eyeIcon, showCurrent && { opacity: 0.5 }]} />
                        </Pressable>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Parola nouă</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            value={data.newPassword}
                            onChangeText={(val) => onChangeHandler('newPassword', val)}
                            style={styles.passwordInput}
                            secureTextEntry={!showNew}
                            maxLength={32}
                            placeholder="Creează o parolă nouă"
                            placeholderTextColor="#A0A0A0"
                        />
                        <Pressable onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                            <Image source={assets.view_icon} style={[styles.eyeIcon, showNew && { opacity: 0.5 }]} />
                        </Pressable>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirmă parola nouă</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            value={data.confirmPassword}
                            onChangeText={(val) => onChangeHandler('confirmPassword', val)}
                            style={styles.passwordInput}
                            secureTextEntry={!showConfirm}
                            maxLength={32}
                            placeholder="Confirmă parola nouă"
                            placeholderTextColor="#A0A0A0"
                        />
                        <Pressable onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                            <Image source={assets.view_icon} style={[styles.eyeIcon, showConfirm && { opacity: 0.5 }]} />
                        </Pressable>
                    </View>
                </View>

                <View style={styles.errorContainer}>
                    {errors ? <Text style={styles.errorText}>{errors}</Text> : null}
                </View>

                <Pressable
                    onPress={() => loading ? null : handleChangePassword()}
                    style={({ pressed }) => [styles.saveButton, pressed && styles.buttonPressed]}
                >
                    {loading
                        ? <ActivityIndicator size="small" color="#FFFFFF" />
                        : <Text style={styles.saveButtonText}>Schimbă parola</Text>
                    }
                </Pressable>

                <View style={styles.dangerZone}>
                    <Text style={styles.dangerTitle}>Ștergere cont</Text>
                    <Text style={styles.dangerDescription}>
                        Această acțiune este ireversibilă. Toate datele tale vor fi șterse definitiv, inclusiv anunțurile, comentariile și conversațiile.
                    </Text>

                    <Pressable
                        onPress={() => {
                            setDeletePassword('');
                            setDeleteError('');
                            setDeleteModal(true);
                        }}
                        style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.8 }]}
                    >
                        <Text style={styles.deleteButtonText}>Șterge contul definitiv</Text>
                    </Pressable>
                </View>

            </KeyboardAwareScrollView>

            {deleteModal && (
                <Modal transparent visible={deleteModal} animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>Ești sigur?</Text>
                            <Text style={styles.modalSubtitle}>
                                Introdu parola ta pentru a confirma. Contul tău și toate datele asociate vor fi șterse permanent.
                            </Text>

                            <TextInput
                                value={deletePassword}
                                onChangeText={setDeletePassword}
                                style={styles.modalInput}
                                secureTextEntry
                                maxLength={32}
                                placeholder="Parola ta"
                                placeholderTextColor="#A0A0A0"
                            />

                            <View style={styles.modalErrorContainer}>
                                {deleteError ? <Text style={styles.modalErrorText}>{deleteError}</Text> : null}
                            </View>

                            <Pressable
                                onPress={() => deleteLoading ? null : handleDeleteAccount()}
                                style={({ pressed }) => [styles.modalDeleteBtn, pressed && { opacity: 0.8 }]}
                            >
                                {deleteLoading
                                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                                    : <Text style={styles.modalDeleteText}>Șterge contul</Text>
                                }
                            </Pressable>

                            <Pressable onPress={() => setDeleteModal(false)} style={styles.modalCancelBtn}>
                                <Text style={styles.modalCancelText}>Anulează</Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#081539',
    },
    menuButton: {
        padding: 8,
    },
    menuIconBox: {
        width: 22,
        height: 16,
        justifyContent: 'space-between',
    },
    menuLine: {
        height: 2.5,
        backgroundColor: '#081539',
        borderRadius: 2,
    },

    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 50,
    },

    sectionLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: '#081539',
        marginBottom: 20,
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
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F7FA',
        borderWidth: 1,
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
    eyeBtn: {
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
        minHeight: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    errorText: {
        color: '#800000',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    saveButton: {
        backgroundColor: '#081539',
        width: '100%',
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#081539',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 6,
    },
    buttonPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: 'bold',
    },

    dangerZone: {
        marginTop: 56,
        paddingTop: 32,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    dangerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#800000',
        marginBottom: 8,
    },
    dangerDescription: {
        fontSize: 13,
        color: '#888888',
        lineHeight: 19,
        marginBottom: 20,
    },
    deleteButton: {
        backgroundColor: '#800000',
        width: '100%',
        height: 54,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(8, 21, 57, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '88%',
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#800000',
        marginBottom: 10,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 22,
    },
    modalInput: {
        width: '100%',
        backgroundColor: '#F5F7FA',
        borderWidth: 1.5,
        borderColor: '#E1E5EB',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#081539',
        marginBottom: 6,
    },
    modalErrorContainer: {
        minHeight: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalErrorText: {
        color: '#800000',
        fontSize: 13,
        fontWeight: '600',
    },
    modalDeleteBtn: {
        width: '100%',
        backgroundColor: '#800000',
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    modalDeleteText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalCancelBtn: {
        paddingVertical: 8,
    },
    modalCancelText: {
        fontSize: 15,
        color: '#666666',
        fontWeight: '500',
    },
});
