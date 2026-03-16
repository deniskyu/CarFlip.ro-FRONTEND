import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
    View, Text, StyleSheet, Modal, Pressable, ScrollView, 
    TextInput, ActivityIndicator, FlatList, Image, SafeAreaView, Platform, KeyboardAvoidingView,
    Alert 
} from 'react-native';
import axios from 'axios';
import { Context } from '../../../context/Context.js';
import { 
    LOCATIONS, BODY_TYPES, FUEL_TYPES, TRANSMISSIONS, 
    POLLUTION_STANDARDS, REGISTRATION_STATUS 
} from '../staticData.js';
import { assets } from '../../../assets.js';
import axiosAuthGuard from '../../../helpers/axiosAuthGuard.js';

const COLORS = {
    primary: '#800000',
    secondary: '#081539',
    background: '#F5F5F5',
    white: '#FFFFFF',
    text: '#333333',
    border: '#E0E0E0',
    placeholder: '#999999'
};

export default function FilterModal({ visible, onClose, navigation }) {
    const { url } = useContext(Context);

    const [activeTab, setActiveTab] = useState('cars'); 

    const [onlyUnseen, setOnlyUnseen] = useState(false);

    const [brands, setBrands] = useState([]);
    const [models, setModels] = useState([]);
    
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [selectedModel, setSelectedModel] = useState(null);
    const [selectedFuel, setSelectedFuel] = useState(null);
    
    const STEERING_OPTIONS = [
        { id: 'left', name: 'Stânga' },
        { id: 'right', name: 'Dreapta' }
    ];

    const [selectedSteering, setSelectedSteering] = useState(null);
    
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [minYear, setMinYear] = useState('');
    const [maxYear, setMaxYear] = useState('');
    
    const [minKm, setMinKm] = useState(''); 
    const [maxKm, setMaxKm] = useState('');

    const [selectedCounty, setSelectedCounty] = useState(null);
    const [selectedBody, setSelectedBody] = useState(null);
    const [selectedTransmission, setSelectedTransmission] = useState(null);
    
    const [selectedPollution, setSelectedPollution] = useState(null);
    const [selectedRegistration, setSelectedRegistration] = useState(null);

    const [forDismantle, setForDismantle] = useState(false);

    const [selectionModalVisible, setSelectionModalVisible] = useState(false);
    const [selectionType, setSelectionType] = useState(null); 
    const [loadingData, setLoadingData] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [profileQuery, setProfileQuery] = useState('');
    const [profileResults, setProfileResults] = useState([]);
    const [loadingProfiles, setLoadingProfiles] = useState(false);

    const [lastSearchedUser, setLastSearchedUser] = useState(null);

    const debounceTimer = useRef(null);

    useEffect(() => {
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, []);

    useEffect(() => {
        if (visible) {
            fetchBrands();
        }
    }, [visible]);

    useEffect(() => {
        if (visible && activeTab === 'profiles') {
            fetchLastSearch();
        }
    }, [visible, activeTab]);

    const fetchLastSearch = async () => {
        try {
            const response = await axiosAuthGuard.get(`/api/users/last-search`);
            if (response.data.success) {
                setLastSearchedUser(response.data.data);
            }
        } catch (error) {
            console.log("Error fetching last search:", error);
        }
    };

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


    const handleProfileSearch = (text) => {
        setProfileQuery(text);
        
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        
        if (text.length < 2) {
            setProfileResults([]);
            return;
        }

        debounceTimer.current = setTimeout(async () => {
            setLoadingProfiles(true);
            try {
                const response = await axiosAuthGuard.get(`/api/users/search?query=${text}`);
                if (response.data.success) {
                    setProfileResults(response.data.data);
                }
            } catch (error) {
                console.log("Profile search error:", error);
            } finally {
                setLoadingProfiles(false);
            }
        }, 300);
    };

    const handleProfilePress = async (userId) => {

        try {
            await axiosAuthGuard.put(`/api/users/last-search`, { targetUserId: userId });
        } catch (error) {
            console.log("Failed to save recent search");
        }


        onClose();
        navigation.navigate('SearchProfileResult', { userId });
    };

    const handleReset = () => {
        if (activeTab === 'cars') {
            setSelectedBrand(null);
            setSelectedModel(null);
            setSelectedFuel(null);
            setMinPrice('');
            setMaxPrice('');
            setMinYear('');
            setMaxYear('');
            setMinKm('');
            setMaxKm('');
            setSelectedCounty(null);
            setSelectedBody(null);
            setSelectedTransmission(null);
            setSelectedPollution(null);
            setSelectedRegistration(null);
            setForDismantle(false);
            setOnlyUnseen(false);
            setSelectedSteering(null);
        } else {
            setProfileQuery('');
            setProfileResults([]);
        }
    };

    const openSelection = (type) => {
        if (type === 'model' && !selectedBrand) {
            Alert.alert("Alege întâi Marca.");
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
        
        if (Number(numericValue) > 10000000) {
            return '10.000.000'; 
        }
        return new Intl.NumberFormat('de-DE').format(numericValue);
    };

    const handleSearch = () => {
        const filters = {};
        
        if (onlyUnseen) filters.exclude_seen = 'true';
        if (selectedBrand?.id) filters.brand_id = selectedBrand.id;
        if (selectedModel?.id) filters.model_id = selectedModel.id;
        
        const fuel = selectedFuel?.name || selectedFuel;
        if (fuel) filters.fuel_type = fuel;
        
        if (minPrice) filters.min_price = minPrice.replace(/\./g, '');
        if (maxPrice) filters.max_price = maxPrice.replace(/\./g, '');
        
        if (minYear) filters.min_year = minYear;
        if (maxYear) filters.max_year = maxYear;

        if (minKm) filters.min_km = minKm.replace(/\./g, '');
        if (maxKm) filters.max_km = maxKm.replace(/\./g, '');

        const county = selectedCounty?.judet || selectedCounty;
        if (county) filters.county = county;
        const body = selectedBody?.name || selectedBody;
        if (body) filters.body_type = body;

        const transmission = selectedTransmission?.name || selectedTransmission;
        if (transmission) filters.transmission = transmission;

        const steering = selectedSteering?.id || selectedSteering;
        if (steering) filters.steering_wheel = steering;

        const pollution = selectedPollution?.name || selectedPollution;
        if (pollution) filters.pollution_standard = pollution; 

        let regStatus = selectedRegistration?.id || selectedRegistration;
        if (regStatus) {
            if (regStatus.toLowerCase() === 'înmatriculat') regStatus = 'registered';
            if (regStatus.toLowerCase() === 'neînmatriculat') regStatus = 'unregistered';
            filters.registration_status = regStatus;
        }
        
        if (forDismantle) filters.for_dismante = 'true';

        if (Object.keys(filters).length === 0) {
            Alert.alert("Atenție", "Te rugăm să selectezi cel puțin un filtru pentru a începe căutarea.");
            return;
        }

        console.log("Sending Filters:", filters);
        onClose();
        navigation.navigate('SearchResultScreen', { filters });
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
                    <Text style={styles.headerTitle}>Filtrează</Text>
                    <Pressable onPress={handleReset}>
                        <Text style={styles.resetText}>Reset</Text>
                    </Pressable>
                </View>

                <View style={styles.tabs}>
                    <Pressable 
                        style={[styles.tab, activeTab === 'cars' && styles.activeTab]}
                        onPress={() => setActiveTab('cars')}
                    >
                        <Text style={[styles.tabText, activeTab === 'cars' && styles.activeTabText]}>MAȘINI</Text>
                    </Pressable>
                    <Pressable 
                        style={[styles.tab, activeTab === 'profiles' && styles.activeTab]}
                        onPress={() => setActiveTab('profiles')}
                    >
                        <Text style={[styles.tabText, activeTab === 'profiles' && styles.activeTabText]}>PROFILURI</Text>
                    </Pressable>
                </View>

                {activeTab === 'cars' ? (
                     <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
                        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>

                            <Pressable 
                                style={[styles.checkboxContainer, {marginBottom: 12}]} 
                                onPress={() => setOnlyUnseen(!onlyUnseen)}
                            >
                                <View style={[styles.checkbox, onlyUnseen && styles.checkboxChecked]}>
                                    {onlyUnseen && <Text style={{color: 'white', fontWeight:'bold'}}>✓</Text>}
                                </View>
                                <Text style={styles.checkboxLabel}>Doar anunțuri ne-văzute (ultimele 30 zile)</Text>
                            </Pressable>
                            
                            <Text style={styles.label}>Marca & Model</Text>
                            <View style={styles.row}>
                                <Pressable style={styles.selectorHalf} onPress={() => openSelection('brand')}>
                                    <Text style={[styles.selText, !selectedBrand && styles.placeholder]}>
                                        {getText(selectedBrand, "Marca")}
                                    </Text>
                                    <Text style={styles.chevron}>▼</Text>
                                </Pressable>
                                <Pressable 
                                    style={[styles.selectorHalf, !selectedBrand && styles.disabled]} 
                                    onPress={() => openSelection('model')}
                                >
                                    <Text style={[styles.selText, !selectedModel && styles.placeholder]}>
                                        {getText(selectedModel, "Model")}
                                    </Text>
                                    <Text style={styles.chevron}>▼</Text>
                                </Pressable>
                            </View>

                            <Text style={styles.label}>Preț (€)</Text>
                            <View style={styles.row}>
                                <TextInput 
                                    style={styles.inputHalf} 
                                    placeholder="De la" 
                                    keyboardType="numeric"
                                    value={minPrice}
                                    onChangeText={(text) => setMinPrice(formatNumberWithDots(text))}
                                />
                                <TextInput 
                                    style={styles.inputHalf} 
                                    placeholder="Până la" 
                                    keyboardType="numeric"
                                    value={maxPrice}
                                    onChangeText={(text) => setMaxPrice(formatNumberWithDots(text))}
                                />
                            </View>

                            <Text style={styles.label}>An Fabricație</Text>
                            <View style={styles.row}>
                                <TextInput 
                                    style={styles.inputHalf} 
                                    placeholder="De la" 
                                    keyboardType="numeric"
                                    value={minYear}
                                    onChangeText={setMinYear}
                                    maxLength={4}
                                />
                                <TextInput 
                                    style={styles.inputHalf} 
                                    placeholder="Până la" 
                                    keyboardType="numeric"
                                    value={maxYear}
                                    onChangeText={setMaxYear}
                                    maxLength={4}
                                />
                            </View>

                            <Text style={styles.label}>Kilometraj</Text>
                            <View style={styles.row}>
                                <TextInput 
                                    style={styles.inputHalf} 
                                    placeholder="Min KM" 
                                    keyboardType="numeric"
                                    value={minKm}
                                    onChangeText={(text) => setMinKm(formatNumberWithDots(text))} 
                                />
                                <TextInput 
                                    style={styles.inputHalf} 
                                    placeholder="Max KM" 
                                    keyboardType="numeric"
                                    value={maxKm}
                                    onChangeText={(text) => setMaxKm(formatNumberWithDots(text))}
                                />
                            </View>

                            <View style={styles.rowLabel}>
                                <View style={{flex:1}}><Text style={styles.label}>Combustibil</Text></View>
                                <View style={{flex:1, marginLeft: 10}}><Text style={styles.label}>Norma Poluare</Text></View>
                            </View>
                            <View style={styles.row}>
                                <Pressable style={styles.selectorHalf} onPress={() => openSelection('fuel')}>
                                    <Text style={[styles.selText, !selectedFuel && styles.placeholder]}>
                                        {getText(selectedFuel, "Oricare")}
                                    </Text>
                                    <Text style={styles.chevron}>▼</Text>
                                </Pressable>
                                
                                <Pressable style={styles.selectorHalf} onPress={() => openSelection('pollution')}>
                                    <Text style={[styles.selText, !selectedPollution && styles.placeholder]}>
                                        {getText(selectedPollution, "Euro X")}
                                    </Text>
                                    <Text style={styles.chevron}>▼</Text>
                                </Pressable>
                            </View>

                            <Text style={styles.label}>Locație & Înmatriculare</Text>
                            <Pressable style={styles.selectorFull} onPress={() => openSelection('county')}>
                                <Text style={styles.labelSmall}>Județ:</Text>
                                <Text style={[styles.selText, !selectedCounty && styles.placeholder]}>
                                    {getText(selectedCounty, "Toată țara")}
                                </Text>
                                <Text style={styles.chevron}>▼</Text>
                            </Pressable>

                             <Pressable style={styles.selectorFull} onPress={() => openSelection('registration')}>
                                <Text style={styles.labelSmall}>Status:</Text>
                                <Text style={[styles.selText, !selectedRegistration && styles.placeholder]}>
                                    {getText(selectedRegistration, "Înmatriculată / Neînmatriculată")}
                                </Text>
                                <Text style={styles.chevron}>▼</Text>
                            </Pressable>


                            <Text style={styles.label}>Caroserie & Cutie</Text>
                            <View style={styles.row}>
                                <Pressable style={styles.selectorHalf} onPress={() => openSelection('body')}>
                                    <Text style={[styles.selText, !selectedBody && styles.placeholder]}>
                                        {getText(selectedBody, "Caroserie")}
                                    </Text>
                                </Pressable>
                                <Pressable style={styles.selectorHalf} onPress={() => openSelection('transmission')}>
                                    <Text style={[styles.selText, !selectedTransmission && styles.placeholder]}>
                                        {getText(selectedTransmission, "Cutie")}
                                    </Text>
                                </Pressable>
                            </View>

                            <Text style={styles.label}>Volan</Text>
                            <Pressable style={styles.selectorFull} onPress={() => openSelection('steering')}>
                                <Text style={[styles.selText, !selectedSteering && styles.placeholder]}>
                                    {getText(selectedSteering, "Alege partea volanului (Stânga/Dreapta)")}
                                </Text>
                                <Text style={styles.chevron}>▼</Text>
                            </Pressable>

                            <Pressable 
                                style={styles.checkboxContainer} 
                                onPress={() => setForDismantle(!forDismantle)}
                            >
                                <View style={[styles.checkbox, forDismantle && styles.checkboxChecked]}>
                                    {forDismantle && <Text style={{color: 'white', fontWeight:'bold'}}>✓</Text>}
                                </View>
                                <Text style={styles.checkboxLabel}>Caut doar mașini pentru dezmembrări</Text>
                            </Pressable>

                            <View style={{height: 100}} /> 
                        </ScrollView>

                        <View style={styles.footer}>
                            <Pressable style={styles.searchButton} onPress={handleSearch}>
                                <Text style={styles.searchButtonText}>AFIȘEAZĂ REZULTATE</Text>
                            </Pressable>
                        </View>
                    </KeyboardAvoidingView>
                ) : (
                    <View style={styles.profileContainer}>
                        <View style={styles.searchContainer}>
                            <TextInput 
                                style={styles.profileInput}
                                placeholder="Caută utilizator după nume..."
                                placeholderTextColor={COLORS.placeholder} 
                                value={profileQuery}
                                onChangeText={handleProfileSearch}
                                autoCapitalize="none"
                            />
                        </View>
                        
                        {!profileQuery && lastSearchedUser && (
                            <View style={{ padding: 20 }}>
                                <Text style={{ color: '#888', marginBottom: 10, fontWeight: '600' }}>Recent</Text>
                                <Pressable 
                                    style={styles.profileItem} 
                                    onPress={() => handleProfilePress(lastSearchedUser._id)}
                                >
                                    <Image 
                                        source={lastSearchedUser.icon ? { uri: lastSearchedUser.icon } : assets.profile_icon} 
                                        style={styles.profileImage}
                                    />
                                    <Text style={styles.profileName}>{lastSearchedUser.username}</Text>
                                </Pressable>
                            </View>
                        )}

                        {loadingProfiles ? (
                            <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 30}} />
                        ) : (
                            <FlatList 
                                data={profileResults}
                                keyExtractor={(item) => item._id}
                                contentContainerStyle={{ padding: 20 }}
                                renderItem={({ item }) => (
                                    <Pressable 
                                        style={styles.profileItem} 
                                        onPress={() => handleProfilePress(item._id)}
                                    >
                                        <Image 
                                            source={item.icon ? { uri: item.icon } : assets.profile_icon} 
                                            style={styles.profileImage}
                                        />
                                        <Text style={styles.profileName}>{item.username}</Text>
                                    </Pressable>
                                )}
                                ListEmptyComponent={
                                    profileQuery.length > 1 && (
                                        <Text style={styles.emptyText}>Niciun utilizator găsit.</Text>
                                    )
                                }
                            />
                        )}
                    </View>
                )}

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
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />

                            {loadingData ? (
                                <ActivityIndicator color={COLORS.primary} size="large" />
                            ) : (
                                <FlatList 
                                    data={getListData()}
                                    keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                                    renderItem={({item}) => (
                                        <Pressable style={styles.listItem} onPress={() => handleSelect(item)}>
                                            {selectionType === 'brand' && item.logo && (
                                                <Image source={{uri: item.logo}} style={{width: 30, height: 30, marginRight: 10, resizeMode:'contain'}} />
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
    container: { flex: 1, backgroundColor: COLORS.white },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#EEE'
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.secondary },
    closeText: { fontSize: 24, color: COLORS.text },
    resetText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
    
    tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
    activeTab: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
    tabText: { fontWeight: '600', color: '#999' },
    activeTabText: { color: COLORS.primary },

    form: { padding: 20 },
    label: { fontSize: 14, fontWeight: '600', color: COLORS.secondary, marginBottom: 8, marginTop: 10 },
    labelSmall: { fontSize: 12, color: '#999', marginRight: 5 },
    
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    rowLabel: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 5 },

    selectorHalf: {
        flex: 0.48, height: 50, backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: COLORS.border,
        borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, justifyContent: 'space-between'
    },
    selectorFull: {
        width: '100%', height: 50, backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: COLORS.border,
        borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginBottom: 10
    },
    inputHalf: {
        flex: 0.48, height: 50, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border,
        borderRadius: 10, paddingHorizontal: 15, fontSize: 16
    },
    selText: { fontSize: 14, color: COLORS.text, flex: 1 },
    placeholder: { color: COLORS.placeholder },
    disabled: { opacity: 0.5, backgroundColor: '#EEE' },
    chevron: { color: '#999', fontSize: 10 },

    checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
    checkbox: { 
        width: 24, height: 24, borderWidth: 2, borderColor: COLORS.border, borderRadius: 6, 
        marginRight: 10, justifyContent: 'center', alignItems: 'center' 
    },
    checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    checkboxLabel: { fontSize: 14, color: COLORS.text },

    footer: {
        padding: 20, borderTopWidth: 1, borderTopColor: '#EEE', backgroundColor: 'white'
    },
    searchButton: {
        backgroundColor: COLORS.primary, height: 55, borderRadius: 15,
        justifyContent: 'center', alignItems: 'center'
    },
    searchButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    profileContainer: { flex: 1, backgroundColor: '#F5F5F5' },
    searchContainer: { padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    profileInput: {
        backgroundColor: '#F0F0F0', height: 50, borderRadius: 12, paddingHorizontal: 15, fontSize: 16
    },
    profileItem: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10,
        shadowColor: "#000", shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2
    },
    profileImage: { width: 50, height: 50, borderRadius: 25, marginRight: 15, borderWidth: 1, borderColor: '#EEE' },
    profileName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
    emptyText: { textAlign: 'center', marginTop: 30, color: '#999', fontSize: 14 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', height: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    closeTextModal: { color: COLORS.primary, fontWeight: 'bold' },
    searchInput: { backgroundColor: '#F5F5F5', height: 45, borderRadius: 10, paddingHorizontal: 15, marginBottom: 15 },
    listItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#EEE', flexDirection: 'row', alignItems: 'center' },
    listItemText: { fontSize: 16 }
});