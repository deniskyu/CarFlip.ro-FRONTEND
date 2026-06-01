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
                showMessage({ type: 'danger', message: 'Eroare', description: 'Nu s-a putut salva județul.' });
                setSavingValue(undefined);
            }
        } catch (error) {
            showMessage({ type: 'danger', message: 'Eroare', description: 'Nu s-a putut salva județul.' });
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
                    <ActivityIndicator size="small" color="#800000" />
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
                            <Text style={styles.title}>Din ce județ dorești să vezi anunțurile?</Text>
                            <Text style={styles.description}>
                                Anunțurile din județul ales vor fi afișate primele în feedul tău. Poți reveni oricând la toată țara.
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
                        {renderRow('Toată țara', null)}
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
        backgroundColor: '#FFFFFF',
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
        color: '#081539',
        marginBottom: 6,
    },
    description: {
        fontSize: 13,
        color: '#777',
        lineHeight: 19,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#800000',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    closeBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: '#E8E8E8',
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
        backgroundColor: '#FBEAEA',
    },
    rowText: {
        flex: 1,
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
        marginRight: 10,
    },
    rowTextSelected: {
        color: '#800000',
        fontWeight: '800',
    },
    rowCheck: {
        fontSize: 16,
        color: '#800000',
        fontWeight: 'bold',
    },
});