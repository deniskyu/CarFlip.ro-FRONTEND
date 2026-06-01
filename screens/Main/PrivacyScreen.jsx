import { ActivityIndicator, Pressable, StyleSheet, View, Image, StatusBar, Keyboard } from 'react-native';

import {Text, TextInput} from '../../helpers/AppText.jsx';
import { useState, useContext, useCallback } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { showMessage } from 'react-native-flash-message';
import { Context } from '../../context/Context.js';
import axiosAuthGuard from '../../helpers/axiosAuthGuard.js';

export default function PrivacyScreen() {
    const navigation = useNavigation();
    const { url } = useContext(Context);

    const [blockedUsers, setBlockedUsers] = useState([]);
    const [blockedLoading, setBlockedLoading] = useState(true);
    const [unblockingId, setUnblockingId] = useState(null);

    const [newUsername, setNewUsername] = useState('');
    const [usernameLoading, setUsernameLoading] = useState(false);
    const [usernameError, setUsernameError] = useState('');

    useFocusEffect(
        useCallback(() => {
            fetchBlockedUsers();
        }, [])
    );

    const fetchBlockedUsers = async () => {
        setBlockedLoading(true);
        try {
            const response = await axiosAuthGuard.get(`${url}/api/user/blocked-list`);
            if (response.data.success) {
                setBlockedUsers(response.data.data);
            }
        } catch (error) {
            console.log('Eroare la blocked list:', error);
        }
        setBlockedLoading(false);
    };

    const handleUnblock = async (targetId) => {
        setUnblockingId(targetId);
        try {
            const response = await axiosAuthGuard.post(`${url}/api/unblock`, {
                target_id: targetId,
            });

            if (response.data.success) {
                setBlockedUsers(prev => prev.filter(u => u._id !== targetId));
                showMessage({
                    message: "Utilizator deblocat",
                    type: "success",
                    icon: "success",
                    duration: 1500,
                });
            }
        } catch (error) {
            showMessage({ message: "Eroare", description: "Nu s-a putut debloca.", type: "danger" });
        }
        setUnblockingId(null);
    };

    const handleChangeUsername = async () => {
        Keyboard.dismiss();
        setUsernameError('');

        const trimmed = newUsername.trim();
        if (!trimmed || trimmed.length < 3) {
            setUsernameError('Numele trebuie să aibă cel puțin 3 caractere.');
            return;
        }

        setUsernameLoading(true);
        try {
            const response = await axiosAuthGuard.put(`${url}/api/user/change-username`, {
                newUsername: trimmed,
            });

            if (response.data.success) {
                showMessage({
                    message: "Succes",
                    description: "Numele a fost schimbat. Restarteaza aplicatia pentru update in profil.",
                    type: "success",
                    icon: "success",
                });
                setNewUsername('');
            } else {
                setUsernameError(response.data.message);
            }
        } catch (er) {
            setUsernameError(er.response?.data?.message || 'Eroare la schimbarea numelui.');
        }
        setUsernameLoading(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Confidențialitate</Text>
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

                <Text style={styles.sectionLabel}>Utilizatori blocați</Text>
                <Text style={styles.sectionDescription}>
                    Utilizatorii blocați nu îți pot vedea profilul, anunțurile sau să îți trimită mesaje.
                </Text>

                {blockedLoading ? (
                    <View style={styles.centeredBox}>
                        <ActivityIndicator size="small" color="#081539" />
                    </View>
                ) : blockedUsers.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>Nu ai blocat niciun utilizator.</Text>
                    </View>
                ) : (
                    <View style={styles.blockedList}>
                        {blockedUsers.map((item) => (
                            <View key={item._id} style={styles.blockedUserRow}>
                                <Image
                                    source={{ uri: item.icon }}
                                    style={styles.blockedAvatar}
                                />
                                <Text style={styles.blockedUsername} numberOfLines={1}>
                                    {item.username}
                                </Text>
                                <Pressable
                                    onPress={() => handleUnblock(item._id)}
                                    style={({ pressed }) => [styles.unblockButton, pressed && { opacity: 0.7 }]}
                                    disabled={unblockingId === item._id}
                                >
                                    {unblockingId === item._id
                                        ? <ActivityIndicator size="small" color="#800000" />
                                        : <Text style={styles.unblockText}>Deblochează</Text>
                                    }
                                </Pressable>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.usernameSection}>
                    <Text style={styles.sectionLabel}>Schimbă numele de utilizator</Text>
                    <Text style={styles.sectionDescription}>
                        Numele tău va fi actualizat pe profil și pe toate anunțurile tale.
                    </Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nume nou</Text>
                        <TextInput
                            value={newUsername}
                            onChangeText={setNewUsername}
                            style={styles.inputBox}
                            maxLength={16}
                            autoCapitalize="none"
                            placeholder="Introdu noul nume"
                            placeholderTextColor="#A0A0A0"
                        />
                    </View>

                    {usernameError ? (
                        <Text style={styles.fieldError}>{usernameError}</Text>
                    ) : null}

                    <Pressable
                        onPress={() => usernameLoading ? null : handleChangeUsername()}
                        style={({ pressed }) => [styles.saveButton, pressed && styles.buttonPressed]}
                    >
                        {usernameLoading
                            ? <ActivityIndicator size="small" color="#FFFFFF" />
                            : <Text style={styles.saveButtonText}>Salvează numele</Text>
                        }
                    </Pressable>
                </View>

            </KeyboardAwareScrollView>
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
        marginBottom: 6,
    },
    sectionDescription: {
        fontSize: 13,
        color: '#888888',
        lineHeight: 19,
        marginBottom: 18,
    },

    centeredBox: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    emptyBox: {
        paddingVertical: 28,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#AAAAAA',
    },
    blockedList: {
        gap: 0,
    },
    blockedUserRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: '#F0F0F0',
    },
    blockedAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E8E8E8',
        marginRight: 12,
    },
    blockedUsername: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#081539',
    },
    unblockButton: {
        backgroundColor: 'rgba(128, 0, 0, 0.08)',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(128, 0, 0, 0.2)',
    },
    unblockText: {
        color: '#800000',
        fontSize: 13,
        fontWeight: '600',
    },

    usernameSection: {
        marginTop: 56,
        paddingTop: 32,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        color: '#081539',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputBox: {
        backgroundColor: '#F5F7FA',
        borderWidth: 1,
        borderColor: '#E1E5EB',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#081539',
        height: 56,
    },
    fieldError: {
        color: '#800000',
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 14,
        marginLeft: 4,
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
});
