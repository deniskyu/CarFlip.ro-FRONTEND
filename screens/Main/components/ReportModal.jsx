import React, { useState } from 'react';
import { 
    View, 
    StyleSheet, 
    Pressable, 
    ActivityIndicator, 
    Keyboard, 
    TouchableWithoutFeedback,
    Alert,
    KeyboardAvoidingView,
    Platform 
} from 'react-native';
import axiosAuthGuard from '../../../helpers/axiosAuthGuard.js';
import {Text, TextInput} from '../../../helpers/AppText.jsx';

const COLORS = {
    primary: '#800000',
    accent: '#E0706C',
    bg: '#1B1F26',
    surface: '#262B33',
    sheet: '#2D333C',
    border: '#2F353E',
    borderStrong: '#3A414B',
    onAccent: '#FFFFFF',
    text: '#E6E8EB',
    textMuted: '#9AA0A8',
    placeholder: '#646B74',
};

const ReportModal = ({ visible, onClose, reportType, reportId }) => {
const [reason, setReason] = useState('');
const [loading, setLoading] = useState(false);
if (!visible) return null;
const handleSubmit = async () => {
if (!reason.trim()) {
            Alert.alert("Eroare", "Te rugăm să scrii un motiv.");
return;
        }
setLoading(true);
try {
const response = await axiosAuthGuard.post('/api/report', {
                target_id: reportId,
                target_type: reportType,
                reason: reason.trim()
            });
if (response.data.success) {
                Alert.alert("Succes", "Raportul a fost trimis. Mulțumim!");
setReason('');
onClose();
            } else {
                Alert.alert("Atenție", response.data.message || "A apărut o eroare.");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Eroare", "Nu s-a putut trimite raportul.");
        } finally {
setLoading(false);
        }
    };
const handleClose = () => {
setReason('');
onClose();
    };
return (
<View style={styles.overlay}>
            <Pressable style={styles.backdrop} onPress={handleClose} />
            <KeyboardAvoidingView 
behavior={Platform.OS === "ios" ? "padding" : "height"}
style={styles.keyboardView}
>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalContent}>
                        <Text style={styles.title}>
                            Raportează {reportType === 'profile' ? 'Profil' : reportType === 'comment' ? 'Comentariu' : 'Postare'}
                        </Text>
                        <Text style={styles.label}>Motiv:</Text>
                        <TextInput
style={styles.input}
placeholder="Descrie problema (ex: spam, conținut inadecvat)..."
placeholderTextColor={COLORS.placeholder}
multiline={true}
numberOfLines={4}
value={reason}
onChangeText={setReason}
maxLength={500}
/>
                        <View style={styles.buttonsRow}>
                            <Pressable 
style={[styles.button, styles.cancelButton]} 
onPress={handleClose}
disabled={loading}
>
                                <Text style={styles.cancelText}>Anulează</Text>
                            </Pressable>
                            <Pressable 
style={[styles.button, styles.submitButton]} 
onPress={handleSubmit}
disabled={loading}
>
                                {loading ? (
<ActivityIndicator size="small" color={COLORS.onAccent} />
                                ) : (
<Text style={styles.submitText}>Trimite</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </View>
    );
};
const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: COLORS.sheet,
        borderRadius: 15,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.accent,
        marginBottom: 15,
        textAlign: 'center'
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8
    },
    input: {
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        padding: 12,
        height: 100,
        textAlignVertical: 'top',
        fontSize: 14,
        color: COLORS.text,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    buttonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center'
    },
    cancelButton: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.borderStrong
    },
    submitButton: {
        backgroundColor: COLORS.primary
    },
    cancelText: {
        color: COLORS.textMuted,
        fontWeight: '600'
    },
    submitText: {
        color: COLORS.onAccent,
        fontWeight: 'bold'
    }
});
export default ReportModal;