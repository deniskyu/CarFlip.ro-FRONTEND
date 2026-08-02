import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    Pressable,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import axiosAuthGuard from '../../../helpers/axiosAuthGuard.js';
import { showMessage } from 'react-native-flash-message';
import { LOCATIONS } from '../staticData.js';

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
    accentSurface: '#3A2526',
};

const COUNTY_NAMES = LOCATIONS.map((loc) => loc.judet).filter(Boolean);

export default function CountyModal({ visible, onClose, currentCounty = null, onCountyChanged }) {
    const [savingValue, setSavingValue] = useState(undefined);

    useEffect(() => {
        if (!visible) setSavingValue(undefined);
    }, [visible]);

    const handleSelect = async (value) => {
        if (savingValue !== undefined) return;
        if (value === currentCounty) {
            onClose();
            return;
        }
        setSavingValue(value === null ? '__ALL__' : value);
        try {
            const res = await axiosAuthGuard.put('/api/user/preferred-county', { county: value });
            if (res.data && res.data.success) {
                onCountyChanged(value);
                onClose();
            } else {
                showMessage({ type: 'danger', message: 'Eroare', description: 'Nu s-a putut salva județul/raionul.' });
                setSavingValue(undefined);
            }
        } catch (error) {
            showMessage({ type: 'danger', message: 'Eroare', description: 'Nu s-a putut salva județul/raionul.' });
            setSavingValue(undefined);
        }
    };

    const renderRow = (label, value) => {
        const selected = value === currentCounty;
        const isSaving = savingValue === (value === null ? '__ALL__' : value);
        return (
            <Pressable
                key={value === null ? '__ALL__' : value}
                style={[styles.row, selected && styles.rowSelected]}
                onPress={() => handleSelect(value)}
                disabled={savingValue !== undefined}
            >
                <Text style={[styles.rowText, selected && styles.rowTextSelected]} numberOfLines={1}>
                    {label}
                </Text>
                {isSaving ? (
                    <ActivityIndicator size="small" color={COLORS.accent} />
                ) : selected ? (
                    <Text style={styles.rowCheck}>✓</Text>
                ) : null}
            </Pressable>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={() => { if (savingValue === undefined) onClose(); }}
        >
            <Pressable
                style={styles.overlay}
                onPress={onClose}
                disabled={savingValue !== undefined}
            >
                <Pressable style={styles.card} onPress={() => {}}>
                    <View style={styles.header}>
                        <View style={styles.headerText}>
                            <Text style={styles.title}>Din ce județ/raion dorești să vezi anunțurile?</Text>
                            <Text style={styles.description}>
                                Anunțurile din județul/raionul ales vor fi afișate primele în feedul tău. Poți reveni oricând la toate regiunile.
                            </Text>
                        </View>
                        <Pressable
                            style={styles.closeBtn}
                            onPress={onClose}
                            disabled={savingValue !== undefined}
                        >
                            <Text style={styles.closeBtnText}>✕</Text>
                        </Pressable>
                    </View>
                    <View style={styles.divider} />
                    <ScrollView
                        style={styles.list}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={true}
                    >
                        {renderRow('Toate regiunile', null)}
                        {COUNTY_NAMES.map((name) => renderRow(name, name))}
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: '90%',
        maxWidth: 420,
        height: '80%',
        backgroundColor: COLORS.sheet,
        borderRadius: 16,
        padding: 20,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerText: {
        flex: 1,
        marginRight: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 6,
    },
    description: {
        fontSize: 13,
        color: COLORS.textMuted,
        lineHeight: 19,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    closeBtnText: {
        color: COLORS.onAccent,
        fontSize: 16,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: 6,
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingVertical: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 10,
        marginBottom: 4,
    },
    rowSelected: {
        backgroundColor: COLORS.accentSurface,
    },
    rowText: {
        flex: 1,
        fontSize: 15,
        color: COLORS.text,
        fontWeight: '500',
        marginRight: 10,
    },
    rowTextSelected: {
        color: COLORS.accent,
        fontWeight: '800',
    },
    rowCheck: {
        fontSize: 16,
        color: COLORS.accent,
        fontWeight: 'bold',
    },
});
