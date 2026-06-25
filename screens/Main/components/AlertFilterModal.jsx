import React, { useState, useEffect, useContext } from 'react';
import { 
    View, StyleSheet, Modal, Pressable, ScrollView, 
    ActivityIndicator, FlatList, Image, SafeAreaView, Platform, KeyboardAvoidingView,
    Alert, StatusBar
} from 'react-native';
import axios from 'axios';
import { Context } from '../../../context/Context.js';
import { 
    LOCATIONS, BODY_TYPES, FUEL_TYPES, TRANSMISSIONS, 
    POLLUTION_STANDARDS, REGISTRATION_STATUS 
} from '../staticData.js'; 
import axiosAuthGuard from '../../../helpers/axiosAuthGuard.js';
import { showMessage } from 'react-native-flash-message';

import {Text, TextInput} from '../../../helpers/AppText.jsx';

const COLORS = {
    primary: '#800000',
    accent: '#E0706C',
    blue: '#007AFF',
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

const STEERING_OPTIONS = [
    { id: 'left', name: 'Stânga' },
    { id: 'right', name: 'Dreapta' }
];

const ENGINE_CAPACITIES = [
    { id: 'electric', name: 'Fără (Electric)' }
];
for (let i = 6; i <= 74; i++) {
    const val = (i / 10).toFixed(1);
    ENGINE_CAPACITIES.push({ id: val, name: `${val} L` });
}

export default function AlertFilterModal({ visible, onClose, alertData, onSaveSuccess }) {
    const { url } = useContext(Context);

    const [loading, setLoading] = useState(false);
    const [brands, setBrands] = useState([]);
    const [models, setModels] = useState([]);

    const [selectedBrand, setSelectedBrand] = useState(null);
    const [selectedModel, setSelectedModel] = useState(null);
    const [selectedFuel, setSelectedFuel] = useState(null);
    const [selectedCapacity, setSelectedCapacity] = useState(null);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [minYear, setMinYear] = useState('');
    const [maxYear, setMaxYear] = useState('');
    const [minKm, setMinKm] = useState('');
    const [maxKm, setMaxKm] = useState('');
    const [selectedCounty, setSelectedCounty] = useState(null);
    const [selectedCity, setSelectedCity] = useState(null);
    const [selectedBody, setSelectedBody] = useState(null);
    const [selectedTransmission, setSelectedTransmission] = useState(null);
    const [selectedPollution, setSelectedPollution] = useState(null);
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [selectedSteering, setSelectedSteering] = useState(null);
    const [forDismantle, setForDismantle] = useState(false);

    const [selectionModalVisible, setSelectionModalVisible] = useState(false);
    const [selectionType, setSelectionType] = useState(null); 
    const [loadingData, setLoadingData] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const formatForInput = (num) => num ? new Intl.NumberFormat('de-DE').format(num) : '';

    useEffect(() => {
        if (visible) {
            fetchBrands();
            if (alertData) {

                setSelectedBrand(alertData.brand || null);
                if (alertData.brand) fetchModels(alertData.brand.id);
                
                setSelectedModel(alertData.model || null);
                setSelectedFuel(alertData.fuel_type ? { name: alertData.fuel_type } : null);
                setSelectedCapacity(
                    alertData.engine_capacity 
                        ? ENGINE_CAPACITIES.find(c => c.id === alertData.engine_capacity) || null 
                        : null
                );

                setMinPrice(formatForInput(alertData.min_price));
                setMaxPrice(formatForInput(alertData.max_price));
                setMinYear(alertData.min_year ? String(alertData.min_year) : '');
                setMaxYear(alertData.max_year ? String(alertData.max_year) : '');
                setMinKm(formatForInput(alertData.min_km));
                setMaxKm(formatForInput(alertData.max_km));
                setSelectedCounty(alertData.county ? { judet: alertData.county } : null);
                setSelectedBody(alertData.body_type ? { id: alertData.body_type, name: alertData.body_type } : null);
                setSelectedTransmission(alertData.transmission ? { id: alertData.transmission, name: alertData.transmission } : null);
                setSelectedPollution(alertData.pollution_standard ? { name: alertData.pollution_standard } : null);
                setSelectedSteering(alertData.steering_wheel ? STEERING_OPTIONS.find(o => o.id === alertData.steering_wheel) : null);
                setForDismantle(!!alertData.for_dismante);
                
                if (alertData.registration_status) {
                    const statusName = alertData.registration_status === 'registered' ? 'Înmatriculat' : 'Neînmatriculat';
                    setSelectedRegistration({ id: alertData.registration_status, name: statusName });
                } else {
                    setSelectedRegistration(null);
                }
            } else {
                handleReset();
            }
        }
    }, [visible, alertData]);

    const fetchBrands = async () => {
        try {
            const response = await axios.get(`${url}/api/brands`);
            if(response.data.success) setBrands(response.data.brands);
        } catch (error) { console.log(error); }
    };

    const fetchModels = async (brandId) => {
        setLoadingData(true);
        try {
            const response = await axios.get(`${url}/api/automobiles?brand_id=${brandId}`);
            if(response.data.success) setModels(response.data.carModels);
        } catch (error) { console.log(error); } 
        finally { setLoadingData(false); }
    };

    const handleReset = () => {
        setSelectedBrand(null);
        setSelectedModel(null);
        setSelectedFuel(null);
        setSelectedCapacity(null);
        setMinPrice('');
        setMaxPrice('');
        setMinYear('');
        setMaxYear('');
        setMinKm('');
        setMaxKm('');
        setSelectedCounty(null);
        setSelectedCity(null);
        setSelectedBody(null);
        setSelectedTransmission(null);
        setSelectedPollution(null);
        setSelectedRegistration(null);
        setSelectedSteering(null);
        setForDismantle(false);
    };

    const openSelection = (type) => {
        if (type === 'model' && !selectedBrand) {
            Alert.alert("Atenție", "Alege întâi Marca.");
            return;
        }
        setSelectionType(type);
        setSearchQuery('');
        setSelectionModalVisible(true);
    };

    const handleSelect = (item) => {
        switch (selectionType) {
            case 'brand':
                setSelectedBrand(item);
                setSelectedModel(null);
                fetchModels(item.id);
                break;
            case 'model':
                setSelectedModel(item);
                break;
            case 'fuel':
                setSelectedFuel(item);
                break;
            case 'capacity':
                setSelectedCapacity(item);
                break;
            case 'county':
                setSelectedCounty(item);
                break;
            case 'body':
                setSelectedBody(item);
                break;
            case 'transmission':
                setSelectedTransmission(item);
                break;
            case 'pollution':
                setSelectedPollution(item);
                break;
            case 'registration':
                setSelectedRegistration(item);
                break;
            case 'steering':
                setSelectedSteering(item);
                break;
        }
        setSelectionModalVisible(false);
    };

    const getListData = () => {
        let data = [];
        switch (selectionType) {
            case 'brand': data = brands; break;
            case 'model': data = models; break;
            case 'fuel': data = FUEL_TYPES; break;
            case 'capacity': data = ENGINE_CAPACITIES; break; 
            case 'county': data = LOCATIONS; break;
            case 'body': data = BODY_TYPES; break;
            case 'transmission': data = TRANSMISSIONS; break;
            case 'pollution': data = POLLUTION_STANDARDS; break;
            case 'registration': data = REGISTRATION_STATUS; break;
            case 'steering': data = STEERING_OPTIONS; break;
        }
        if (!searchQuery) return data;
        
        return data.filter(item => {
            const name = item.name || item.judet || item || ""; 
            return name.toString().toLowerCase().includes(searchQuery.toLowerCase());
        });
    };

    const formatNumberWithDots = (text) => {
        const numericValue = text.replace(/[^0-9]/g, '');
        if (!numericValue) return '';
        if (Number(numericValue) > 10000000) return '10.000.000'; 
        return new Intl.NumberFormat('de-DE').format(numericValue);
    };

    const handleSaveAlert = async () => {
        if (!selectedBrand) {
            Alert.alert("Eroare", "Marca este obligatorie pentru a salva o căutare.");
            return;
        }

        setLoading(true);

        const payload = {
            brand: {
                id: selectedBrand.id,
                name: selectedBrand.name,
                logo: selectedBrand.logo
            },
            model: selectedModel ? { id: selectedModel.id, name: selectedModel.name } : null,
            fuel_type: selectedFuel ? selectedFuel.name : null,
            engine_capacity: selectedCapacity ? selectedCapacity.id : null,
            min_price: minPrice ? Number(minPrice.replace(/\./g, '')) : null,
            max_price: maxPrice ? Number(maxPrice.replace(/\./g, '')) : null,
            min_year: minYear ? Number(minYear) : null,
            max_year: maxYear ? Number(maxYear) : null,
            min_km: minKm ? Number(minKm.replace(/\./g, '')) : null,
            max_km: maxKm ? Number(maxKm.replace(/\./g, '')) : null,
            county: selectedCounty ? (selectedCounty.judet || selectedCounty.name) : null,
            body_type: selectedBody ? selectedBody.name : null,
            transmission: selectedTransmission ? selectedTransmission.name : null,
            steering_wheel: selectedSteering ? selectedSteering.id : null,
            pollution_standard: selectedPollution ? selectedPollution.name : null,
            for_dismante: forDismantle ? true : null
        };

        if (selectedRegistration) {
            let regStatus = selectedRegistration.id || selectedRegistration.name;
            if (regStatus.toLowerCase() === 'înmatriculat') regStatus = 'registered';
            if (regStatus.toLowerCase() === 'neînmatriculat') regStatus = 'unregistered';
            payload.registration_status = regStatus;
        }

        try {
            let response;
            if (alertData && alertData._id) {
                response = await axiosAuthGuard.put(`/api/alerts/${alertData._id}`, payload);
            } else {
                response = await axiosAuthGuard.post(`/api/alerts`, payload);
            }

            if (response.data.success) {
                showMessage({
                    message: "Succes",
                    description: response.data.message,
                    type: "success",
                });
                onSaveSuccess();
                onClose(); 
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Eroare la salvarea alertei.";
            Alert.alert("Eroare", errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const getText = (val, placeholder) => {
        if (!val) return placeholder;
        return val.name || val.judet || val; 
    };

    return (
        <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Pressable onPress={onClose} style={styles.closeBtn}>
                        <Text style={styles.closeText}>✕</Text>
                    </Pressable>
                    <Text style={styles.headerTitle}>{alertData ? 'Editează Căutarea' : 'Adaugă Căutare'}</Text>
                    <Pressable onPress={handleReset}>
                        <Text style={styles.resetText}>Curăță</Text>
                    </Pressable>
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
                    <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
                        
                        <Text style={styles.label}>Marca & Model</Text>
                        <View style={styles.row}>
                            <Pressable style={styles.selectorHalf} onPress={() => openSelection('brand')}>
                                <Text style={[styles.selText, !selectedBrand && styles.placeholder]}>
                                    {getText(selectedBrand, "Marca (Obligatoriu)")}
                                </Text>
                                <Text style={styles.chevron}>▼</Text>
                            </Pressable>
                            <Pressable 
                                style={[styles.selectorHalf, !selectedBrand && styles.disabled]} 
                                onPress={() => openSelection('model')}
                            >
                                <Text style={[styles.selText, !selectedModel && styles.placeholder]}>
                                    {getText(selectedModel, "Model (Opțional)")}
                                </Text>
                                <Text style={styles.chevron}>▼</Text>
                            </Pressable>
                        </View>

                        <Text style={styles.label}>Preț (€)</Text>
                        <View style={styles.row}>
                            <TextInput 
                                style={styles.inputHalf} placeholder="De la" placeholderTextColor={COLORS.placeholder} keyboardType="numeric"
                                value={minPrice} onChangeText={(text) => setMinPrice(formatNumberWithDots(text))}
                            />
                            <TextInput 
                                style={styles.inputHalf} placeholder="Până la" placeholderTextColor={COLORS.placeholder} keyboardType="numeric"
                                value={maxPrice} onChangeText={(text) => setMaxPrice(formatNumberWithDots(text))}
                            />
                        </View>

                        <Text style={styles.label}>An Fabricație</Text>
                        <View style={styles.row}>
                            <TextInput 
                                style={styles.inputHalf} placeholder="De la" placeholderTextColor={COLORS.placeholder} keyboardType="numeric"
                                value={minYear} onChangeText={setMinYear} maxLength={4}
                            />
                            <TextInput 
                                style={styles.inputHalf} placeholder="Până la" placeholderTextColor={COLORS.placeholder} keyboardType="numeric"
                                value={maxYear} onChangeText={setMaxYear} maxLength={4}
                            />
                        </View>

                        <Text style={styles.label}>Kilometraj</Text>
                        <View style={styles.row}>
                            <TextInput 
                                style={styles.inputHalf} placeholder="Min KM" placeholderTextColor={COLORS.placeholder} keyboardType="numeric"
                                value={minKm} onChangeText={(text) => setMinKm(formatNumberWithDots(text))} 
                            />
                            <TextInput 
                                style={styles.inputHalf} placeholder="Max KM" placeholderTextColor={COLORS.placeholder} keyboardType="numeric"
                                value={maxKm} onChangeText={(text) => setMaxKm(formatNumberWithDots(text))}
                            />
                        </View>

                        <Text style={styles.label}>Motorizare</Text>
                        <View style={styles.row}>
                            <Pressable style={styles.selectorHalf} onPress={() => openSelection('fuel')}>
                                <Text style={[styles.selText, !selectedFuel && styles.placeholder]}>
                                    {getText(selectedFuel, "Combustibil")}
                                </Text>
                                <Text style={styles.chevron}>▼</Text>
                            </Pressable>
                            <Pressable style={styles.selectorHalf} onPress={() => openSelection('capacity')}>
                                <Text style={[styles.selText, !selectedCapacity && styles.placeholder]}>
                                    {getText(selectedCapacity, "Capacitate motor")}
                                </Text>
                                <Text style={styles.chevron}>▼</Text>
                            </Pressable>
                        </View>

                        <Text style={styles.label}>Locație</Text>
                        <Pressable style={styles.selectorFull} onPress={() => openSelection('county')}>
                            <Text style={styles.labelSmall}>Județ:</Text>
                            <Text style={[styles.selText, !selectedCounty && styles.placeholder]}>
                                {getText(selectedCounty, "Orice județ")}
                            </Text>
                            <Text style={styles.chevron}>▼</Text>
                        </Pressable>

                        <Text style={styles.label}>Detalii Tehnice</Text>
                        <View style={styles.row}>
                            <Pressable style={styles.selectorHalf} onPress={() => openSelection('body')}>
                                <Text style={[styles.selText, !selectedBody && styles.placeholder]}>
                                    {getText(selectedBody, "Caroserie")}
                                </Text>
                            </Pressable>
                            <Pressable style={styles.selectorHalf} onPress={() => openSelection('transmission')}>
                                <Text style={[styles.selText, !selectedTransmission && styles.placeholder]}>
                                    {getText(selectedTransmission, "Cutie viteze")}
                                </Text>
                            </Pressable>
                        </View>

                        <View style={styles.row}>
                            <Pressable style={styles.selectorHalf} onPress={() => openSelection('steering')}>
                                <Text style={[styles.selText, !selectedSteering && styles.placeholder]}>
                                    {getText(selectedSteering, "Volan")}
                                </Text>
                            </Pressable>
                            <Pressable style={styles.selectorHalf} onPress={() => openSelection('pollution')}>
                                <Text style={[styles.selText, !selectedPollution && styles.placeholder]}>
                                    {getText(selectedPollution, "Poluare")}
                                </Text>
                            </Pressable>
                        </View>

                        <Pressable style={[styles.selectorFull, {marginTop: 10}]} onPress={() => openSelection('registration')}>
                            <Text style={styles.labelSmall}>Status:</Text>
                            <Text style={[styles.selText, !selectedRegistration && styles.placeholder]}>
                                {getText(selectedRegistration, "Înmatriculată / Neînmatriculată")}
                            </Text>
                            <Text style={styles.chevron}>▼</Text>
                        </Pressable>

                        <Pressable style={styles.checkboxContainer} onPress={() => setForDismantle(!forDismantle)}>
                            <View style={[styles.checkbox, forDismantle && styles.checkboxChecked]}>
                                {forDismantle && <Text style={{color: 'white', fontWeight:'bold', textAlign: 'center', lineHeight: 16, includeFontPadding: false}}>✓</Text>}
                            </View>
                            <Text style={styles.checkboxLabel}>Vreau doar mașini pentru dezmembrări</Text>
                        </Pressable>

                        <View style={{height: 50}} /> 
                    </ScrollView>

                    <View style={styles.footer}>
                        <Pressable style={styles.saveButton} onPress={handleSaveAlert} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.saveButtonText}>{alertData ? 'ACTUALIZEAZĂ ALERTA' : 'SALVEAZĂ ALERTA'}</Text>
                            )}
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>

                <Modal visible={selectionModalVisible} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Selectează</Text>
                                <Pressable onPress={() => setSelectionModalVisible(false)}>
                                    <Text style={styles.closeTextModal}>Închide</Text>
                                </Pressable>
                            </View>
                            
                            <TextInput 
                                style={styles.searchInput}
                                placeholder="Caută în listă..."
                                placeholderTextColor={COLORS.placeholder}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />

                            {loadingData ? (
                                <ActivityIndicator color={COLORS.accent} size="large" />
                            ) : (
                                <FlatList 
                                    data={getListData()}
                                    keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                                    renderItem={({item}) => (
                                        <Pressable style={styles.listItem} onPress={() => handleSelect(item)}>
                                            {selectionType === 'brand' && (
                                                <View style={styles.brandChip}>
                                                    <Text style={styles.brandChipText}>
                                                        {item.name ? item.name.substring(0, 3).toUpperCase() : '---'}
                                                    </Text>
                                                </View>
                                            )}
                                            <Text style={styles.listItemText}>{item.name || item.judet || item}</Text>
                                        </Pressable>
                                    )}
                                />
                            )}
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: COLORS.bg,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
    closeBtn: { padding: 5 },
    closeText: { fontSize: 24, color: COLORS.text },
    resetText: { fontSize: 14, color: COLORS.accent, fontWeight: '600', padding: 5 },
    
    form: { padding: 20 },
    label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 10 },
    labelSmall: { fontSize: 12, color: COLORS.textMuted, marginRight: 5 },
    
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },

    selectorHalf: {
        flex: 0.48, height: 50, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
        borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, justifyContent: 'space-between'
    },
    selectorFull: {
        width: '100%', height: 50, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
        borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginBottom: 10
    },
    inputHalf: {
        flex: 0.48, height: 50, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
        borderRadius: 10, paddingHorizontal: 15, fontSize: 16, color: COLORS.text
    },
    selText: { fontSize: 14, color: COLORS.text, flex: 1 },
    placeholder: { color: COLORS.placeholder },
    disabled: { opacity: 0.5, backgroundColor: COLORS.bg },
    chevron: { color: COLORS.textMuted, fontSize: 10 },

    checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
    checkbox: { 
        width: 24, height: 24, borderWidth: 2, borderColor: COLORS.borderStrong, borderRadius: 6, 
        marginRight: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface
    },
    checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    checkboxLabel: { fontSize: 14, color: COLORS.text, fontWeight: '500' },

    footer: {
        padding: 20, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.bg
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        height: 55, 
        borderRadius: 15,
        justifyContent: 'center', 
        alignItems: 'center'
    },
    saveButtonText: { color: COLORS.onAccent, fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.sheet, height: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
    closeTextModal: { color: COLORS.accent, fontWeight: 'bold', fontSize: 16 },
    searchInput: { backgroundColor: COLORS.surface, height: 45, borderRadius: 10, paddingHorizontal: 15, marginBottom: 15, fontSize: 16, color: COLORS.text },
    listItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center' },
    listItemText: { fontSize: 16, color: COLORS.text },
    brandChip: {
        width: 30, height: 30, marginRight: 10, backgroundColor: COLORS.surface,
        justifyContent: 'center', alignItems: 'center', borderRadius: 15,
        borderWidth: 1, borderColor: COLORS.border
    },
    brandChipText: { fontSize: 10, fontWeight: 'bold', color: COLORS.accent }
});