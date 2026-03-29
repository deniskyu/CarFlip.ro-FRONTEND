import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    Pressable, 
    Image, 
    TextInput, 
    Modal, 
    FlatList, 
    Alert, 
    ActivityIndicator, 
    Platform,
    KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import { Context } from '../../context/Context.js';
import { LOCATIONS, FUEL_TYPES } from './staticData.js';
import { emitter } from '../../helpers/eventBus.js';
import { normalizeMediaUri } from '../../helpers/normalizeMediaUri.js';

const COLORS = {
    primary: '#800000',
    secondary: '#081539',
    background: '#F5F5F5',
    white: '#FFFFFF',
    text: '#333333',
    border: '#E0E0E0',
    placeholder: '#999999',
    disabled: '#F0F0F0'
};


const ENGINE_CAPACITIES = [
    { id: 'electric', name: 'Fără (Electric)' }
];
for (let i = 6; i <= 74; i++) {
    const val = (i / 10).toFixed(1);
    ENGINE_CAPACITIES.push({ id: val, name: `${val} L` });
}

const BODY_TYPES = [
    { id: 'sedan', name: 'Sedan' },
    { id: 'suv', name: 'SUV' },
    { id: 'hatchback', name: 'Hatchback' },
    { id: 'break', name: 'Break (Combi)' },
    { id: 'coupe', name: 'Coupe' },
    { id: 'cabrio', name: 'Cabrio' },
    { id: 'minivan', name: 'Minivan' },
    { id: 'pickup', name: 'Pick-up' },
    { id: 'van', name: 'Van' }
];

const CAR_COLORS = [
    { id: 'alb', name: 'Alb' },
    { id: 'negru', name: 'Negru' },
    { id: 'gri', name: 'Gri' },
    { id: 'argintiu', name: 'Argintiu' },
    { id: 'albastru', name: 'Albastru' },
    { id: 'rosu', name: 'Roșu' },
    { id: 'verde', name: 'Verde' },
    { id: 'galben', name: 'Galben' },
    { id: 'maro', name: 'Maro' },
    { id: 'portocaliu', name: 'Portocaliu' },
    { id: 'bej', name: 'Bej' },
    { id: 'auriu', name: 'Auriu' },
    { id: 'altul', name: 'Alta culoare' }
];

const TRANSMISSIONS = [
    { id: 'manual', name: 'Manuală' },
    { id: 'automată', name: 'Automată' }
];

const POLLUTION_STANDARDS = [
    { id: 'noneuro', name: 'Non-Euro' },
    { id: 'euro1', name: 'Euro 1' },
    { id: 'euro2', name: 'Euro 2' },
    { id: 'euro3', name: 'Euro 3' },
    { id: 'euro4', name: 'Euro 4' },
    { id: 'euro5', name: 'Euro 5' },
    { id: 'euro6', name: 'Euro 6' },
    { id: 'electric', name: 'Electric' }
];

const DRIVETRAINS = [
    { id: 'fwd', name: 'Față (FWD)' },
    { id: 'rwd', name: 'Spate (RWD)' },
    { id: 'awd', name: 'Integrală (4x4/AWD)' }
];

export default function AddSaleScreen({ navigation }) {
    const { url, setDraftSale } = useContext(Context); 

    const [media, setMedia] = useState([]);
    
    const [brands, setBrands] = useState([]);
    const [models, setModels] = useState([]);
    const [yearsList, setYearsList] = useState([]);
    const [countiesList, setCountiesList] = useState([]);
    const [citiesList, setCitiesList] = useState([]);

    const [selectedBrand, setSelectedBrand] = useState(null);
    const [selectedModel, setSelectedModel] = useState(null);
    const [selectedFuel, setSelectedFuel] = useState(null);
    const [selectedCapacity, setSelectedCapacity] = useState(null);
    const [mileage, setMileage] = useState('');
    const [price, setPrice] = useState('');
    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedBody, setSelectedBody] = useState(null);
    const [selectedColor, setSelectedColor] = useState(null);
    const [selectedTransmission, setSelectedTransmission] = useState(null);
    const [selectedPollution, setSelectedPollution] = useState(null);
    const [selectedDrivetrain, setSelectedDrivetrain] = useState(null);
    const [selectedCounty, setSelectedCounty] = useState(null);
    const [selectedCity, setSelectedCity] = useState(null);
    
    const [vin, setVin] = useState('');
    const [selectedRegistration, setSelectedRegistration] = useState('registered');
    const [selectedExchange, setSelectedExchange] = useState(false);
    const [selectedDismantle, setSelectedDismantle] = useState(false);
    const [steeringWheel, setSteeringWheel] = useState('left');
    const [negotiable, setNegotiable] = useState(false);

    const [disableComments, setDisableComments] = useState(false);

    const [phoneNumber, setPhoneNumber] = useState(''); 
    const [description, setDescription] = useState('');


    const [modalVisible, setModalVisible] = useState(false);
    const [currentSelectionType, setCurrentSelectionType] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [loadingBrands, setLoadingBrands] = useState(true);
    const [loadingData, setLoadingData] = useState(false);

    const [loadingMedia, setLoadingMedia] = useState(false);

    useEffect(() => {
        fetchBrands();
        generateYears();
        loadCounties();
    }, []);

    const generateYears = () => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = 0; i <= 90; i++) {
            years.push({ id: i, name: (currentYear - i).toString() });
        }
        setYearsList(years);
    };

    const loadCounties = () => {
        const formattedCounties = LOCATIONS.map(item => ({
            id: item.judet,
            name: item.judet,
            cities: item.orase
        }));
        setCountiesList(formattedCounties);
    };

    const fetchBrands = async () => {
        setLoadingBrands(true);
        try {
            const response = await axios.get(`${url}/api/brands`);
            if(response.data.success) {
                setBrands(response.data.brands);
            }
        } catch (error) {
            console.log(error);
        } finally {
            setLoadingBrands(false);
        }
    };

    const fetchModels = async (brandId) => {
        setLoadingData(true);
        try {
            const response = await axios.get(`${url}/api/automobiles?brand_id=${brandId}`); 
            if(response.data.success) {
                setModels(response.data.carModels);
            }
        } catch (error) {
            console.log(error);
        } finally {
            setLoadingData(false);
        }
    };

    const isPickingRef = useRef(false);

    const handlePickMedia = async () => {
        if (isPickingRef.current) return;
        
        if (media.length >= 10) {
            Alert.alert("Limită atinsă", "Poți încărca maxim 10 fișiere.");
            return;
        }
    
        isPickingRef.current = true;
        setLoadingMedia(true);
    
        const options = {
            mediaType: 'mixed',
            selectionLimit: 10 - media.length,
            videoQuality: 'high',
        };
    
        try {
            const result = await launchImageLibrary(options);
    
            if (result.didCancel || result.errorCode) {
                return;
            }
    
            if (result.assets) {
                const newFiles = result.assets;
                let currentMedia = [...media];

                const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15 mb
                const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 mb

                let videoCount = currentMedia.filter(f => f.type && f.type.includes('video')).length;
                
                for (let file of newFiles) {
                    const isVideo = file.type && file.type.includes('video');
                    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
                    if (file.fileSize && file.fileSize > maxSize) {
                        Alert.alert(
                            'Fișier prea mare',
                            isVideo
                                ? `Videoclipul "${file.fileName || 'fișier'}" depășește 50 MB și a fost ignorat.`
                                : `Imaginea "${file.fileName || 'fișier'}" depășește 15 MB și a fost ignorată.`
                        );
                        continue;
                    }                
                    if (file.type && file.type.includes('video')) {
                        if (videoCount > 1) {
                            Alert.alert("Info", "Poți avea maxim 1 videoclip.");
                            continue;
                        }
                        if (file.duration && file.duration > 25) {
                            Alert.alert("Video prea lung", "Videoclipul trebuie să aibă maxim 25 secunde.");
                            continue;
                        }
                        videoCount++;
                    }
                    if (currentMedia.length < 10) {
                        const normalized = await normalizeMediaUri(file);
                        if (normalized) {
                            currentMedia.push(normalized);
                        } else {
                            Alert.alert('Eroare', `Fișierul "${file.fileName || 'fișier'}" nu a putut fi procesat.`);
                        }
                    }
                }
                setMedia(currentMedia);
            }
        } catch (error) {
            console.log("Picker error:", error);
        } finally {
            isPickingRef.current = false;
            setLoadingMedia(false);
        }
    };

    const removeMedia = (index) => {
        const updated = [...media];
        updated.splice(index, 1);
        setMedia(updated);
    };

    const formatMileage = (text) => {
        const numericValue = text.replace(/[^0-9]/g, '');
        if (!numericValue) {
            setMileage('');
            return;
        }
        if (Number(numericValue) > 10000000) return;
        const formatted = new Intl.NumberFormat('de-DE').format(numericValue);
        setMileage(formatted);
    };

    const formatPrice = (text) => {
        const numericValue = text.replace(/[^0-9]/g, '');
        if (!numericValue) {
            setPrice('');
            return;
        }
        if (Number(numericValue) > 10000000) return;
        const formatted = new Intl.NumberFormat('de-DE').format(numericValue);
        setPrice(formatted);
    };

    const openModal = (type) => {
        if (type === 'model') {
            if (!selectedBrand) {
                Alert.alert("Atenție", "Alege întâi Marca.");
                return;
            }
            if (models.length === 0) {
                fetchModels(selectedBrand.id);
            }
        }
        if (type === 'city') {
            if (!selectedCounty) {
                Alert.alert("Atenție", "Alege întâi Județul.");
                return;
            }
        }

        setCurrentSelectionType(type);
        setSearchQuery('');
        setModalVisible(true);
    };

    const handleSelect = (item) => {
        switch (currentSelectionType) {
            case 'brand':
                setSelectedBrand(item);
                setSelectedModel(null);
                setModels([]);
                fetchModels(item.id); 
                break;
            case 'model':
                setSelectedModel(item);
                break;
            case 'fuel':
                setSelectedFuel(item);
                if (item.id === 'electric') {
                    setSelectedCapacity(ENGINE_CAPACITIES.find(c => c.id === 'electric'));
                } else if (selectedCapacity && selectedCapacity.id === 'electric') {
                    setSelectedCapacity(null);
                }
                break;
            case 'capacity':
                setSelectedCapacity(item);
                if (item.id === 'electric') {
                    setSelectedFuel(FUEL_TYPES.find(f => f.id === 'electric'));
                }
                break;
            case 'year':
                setSelectedYear(item);
                break;
            case 'body':
                setSelectedBody(item);
                break;
            case 'color':
                setSelectedColor(item);
                break;
            case 'transmission':
                setSelectedTransmission(item);
                break;
            case 'pollution':
                setSelectedPollution(item);
                break;
            case 'drivetrain':
                setSelectedDrivetrain(item);
                break;
            case 'county':
                setSelectedCounty(item);
                setSelectedCity(null);
                const cities = item.cities.map(city => ({ id: city, name: city }));
                setCitiesList(cities);
                break;
            case 'city':
                setSelectedCity(item);
                break;
        }
        setModalVisible(false);
    };

    const resetForm = useCallback(() => {
        setMedia([]);
        setSelectedBrand(null);
        setSelectedModel(null);
        setSelectedFuel(null);
        setSelectedCapacity(null);
        setMileage('');
        setPrice('');
        setSelectedYear(null);
        setSelectedBody(null);
        setSelectedColor(null);
        setSelectedTransmission(null);
        setSelectedPollution(null);
        setSelectedDrivetrain(null);
        setSelectedCounty(null);
        setSelectedCity(null);
        setVin('');
        setSelectedRegistration('registered');
        setSelectedExchange(false);
        setSelectedDismantle(false);
        setSteeringWheel('left');
        setNegotiable(false);
        setDisableComments(false);
        setPhoneNumber('');
        setDescription('');
    }, []);

    useEffect(() => {
        emitter.on('reset_sale_form', resetForm);
        return () => {
            emitter.off('reset_sale_form', resetForm);
        };

    }, [resetForm]);

    const getFilteredData = () => {
        let data = [];
        switch (currentSelectionType) {
            case 'brand': data = brands; break;
            case 'model': data = models; break;
            case 'fuel': data = FUEL_TYPES; break;
            case 'capacity': data = ENGINE_CAPACITIES; break;
            case 'year': data = yearsList; break;
            case 'body': data = BODY_TYPES; break;
            case 'color': data = CAR_COLORS; break;
            case 'transmission': data = TRANSMISSIONS; break;
            case 'pollution': data = POLLUTION_STANDARDS; break;
            case 'drivetrain': data = DRIVETRAINS; break;
            case 'county': data = countiesList; break;
            case 'city': data = citiesList; break;
        }

        if (!searchQuery) return data;
        return data.filter(item => 
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    const isLoading = () => {
        if (currentSelectionType === 'brand' && loadingBrands) return true;
        if (currentSelectionType === 'model' && loadingData) return true;
        return false;
    };

    const getModalTitle = () => {
        switch (currentSelectionType) {
            case 'brand': return 'Alege Marca';
            case 'model': return 'Alege Modelul';
            case 'fuel': return 'Combustibil';
            case 'capacity': return 'Capacitate Motor';
            case 'year': return 'Anul Fabricației';
            case 'body': return 'Tip Caroserie';
            case 'color': return 'Culoare';
            case 'transmission': return 'Cutie de Viteze';
            case 'pollution': return 'Norma de Poluare';
            case 'drivetrain': return 'Tracțiune';
            case 'county': return 'Județ';
            case 'city': return 'Oraș';
            default: return 'Selectează';
        }
    };


    const handleNavigateToPreview = () => {
        const hasPhoto = media.some(file => file.type && file.type.includes('image'));

        if (
            !selectedBrand || !selectedModel || !selectedFuel || !selectedCapacity ||
            !price || !mileage || !hasPhoto || !phoneNumber || !selectedYear || // Am schimbat !media.length cu !hasPhoto
            !selectedCounty || !selectedCity || !selectedBody || !selectedColor ||
            !selectedTransmission || !selectedDrivetrain || !selectedPollution || !description.trim()
        ) {
            Alert.alert(
                "Eroare", 
                "Te rugăm să completezi toate câmpurile obligatorii și să adaugi cel puțin o FOTOGRAFIE (videoclipurile sunt opționale)."
            );
            return;
        }

        const draftData = {
            media: media,
            brand: { id: selectedBrand.id, name: selectedBrand.name },
            model: { id: selectedModel.id, name: selectedModel.name },
            engine: { capacity: selectedCapacity.name, fuel_type: selectedFuel.name },
            price: price.replace(/\./g, ''),
            negotiable: negotiable,
            mileage: mileage.replace(/\./g, ''),
            production_year: selectedYear.name,
            vin: vin,
            body_type: selectedBody.name,
            color: selectedColor.name,
            transmission: selectedTransmission.name,
            drivetrain: selectedDrivetrain.name,
            pollution_standard: selectedPollution.name,
            steering_wheel: steeringWheel,
            location: { county: selectedCounty.name, city: selectedCity.name },
            registration_status: selectedRegistration,
            exchange_accepted: selectedExchange,
            for_dismante: selectedDismantle,
            phone_number: phoneNumber,
            description: description,
            allow_comments: !disableComments,
        };

        setDraftSale(draftData);
        navigation.navigate('PreviewSaleScreen');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Vinde Mașina</Text>
            </View>

            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            >
                <ScrollView 
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Imagini & Video ({media.length}/10)</Text>
                        <Text style={styles.sectionSubtitle}>Maxim 10 fișiere (max 1 video, max 25s). Imaginile nu pot depăși 15 MB, iar videoclipurile 50 MB.
                        </Text>
                        <Text style={[styles.sectionSubtitle, {marginBottom: 4}]}>O imagine este obligatorie, și va fi cea de copertă in profil. Procesarea anunțului va dura undeva la câteva minute. si aici, lipsește una sau doua.</Text>
                        <Text style={[styles.sectionSubtitle, {marginBottom: 12, color: '#800000'}]}>După 3 luni, anunțul va fi dezactivat automat. Poți intra la secțiunea de profil pentru a reactiva încă 3 luni anunțul.</Text>
                        <View style={{ position: 'relative' }}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
                                <Pressable style={styles.addMediaButton} onPress={handlePickMedia} disabled={loadingMedia}>
                                    {loadingMedia ? (
                                        <ActivityIndicator size="small" color={COLORS.primary} />
                                    ) : (
                                        <>
                                            <Text style={styles.plusSign}>+</Text>
                                            <Text style={styles.addText}>Adaugă</Text>
                                        </>
                                    )}
                                </Pressable>

                                {media.map((file, index) => (
                                    <View key={index} style={styles.mediaItem}>
                                        <Image source={{ uri: file.uri }} style={styles.mediaImage} />
                                        {file.type && file.type.includes('video') && (
                                            <View style={styles.videoBadge}>
                                                <Text style={{color: 'white', fontSize: 10, fontWeight: 'bold'}}>VIDEO</Text>
                                            </View>
                                        )}
                                        <Pressable style={styles.deleteButton} onPress={() => removeMedia(index)}>
                                            <Text style={styles.deleteText}>X</Text>
                                        </Pressable>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    </View>

                    <View style={styles.formContainer}>
                        
                        <Text style={styles.label}>Marca</Text>
                        <Pressable style={styles.inputSelector} onPress={() => openModal('brand')}>
                            {selectedBrand && selectedBrand.logo ? (
                                <Image source={{ uri: selectedBrand.logo }} style={styles.brandLogoSmall} />
                            ) : null}
                            <Text style={[styles.inputText, !selectedBrand && styles.placeholderText]}>
                                {selectedBrand ? selectedBrand.name : "Selectează marca..."}
                            </Text>
                            <Text style={styles.chevron}>▼</Text>
                        </Pressable>

                        <Text style={styles.label}>Model</Text>
                        <Pressable 
                            style={[styles.inputSelector, !selectedBrand && styles.disabledInput]} 
                            onPress={() => openModal('model')}
                        >
                            <Text style={[styles.inputText, !selectedModel && styles.placeholderText]}>
                                {selectedModel ? selectedModel.name : "Selectează modelul..."}
                            </Text>
                            <Text style={styles.chevron}>▼</Text>
                        </Pressable>

                        <Text style={styles.label}>Combustibil</Text>
                        <Pressable style={styles.inputSelector} onPress={() => openModal('fuel')}>
                            <Text style={[styles.inputText, !selectedFuel && styles.placeholderText]}>
                                {selectedFuel ? selectedFuel.name : "Selectează combustibilul..."}
                            </Text>
                            <Text style={styles.chevron}>▼</Text>
                        </Pressable>

                        <Text style={styles.label}>Capacitate Motor</Text>
                        <Pressable style={styles.inputSelector} onPress={() => openModal('capacity')}>
                            <Text style={[styles.inputText, !selectedCapacity && styles.placeholderText]}>
                                {selectedCapacity ? selectedCapacity.name : "Selectează capacitatea..."}
                            </Text>
                            <Text style={styles.chevron}>▼</Text>
                        </Pressable>

                        <Text style={styles.label}>Preț</Text>
                        <View style={styles.inputSelector}>
                            <TextInput 
                                style={styles.inputText}
                                placeholder="Ex: 5.000"
                                placeholderTextColor={COLORS.placeholder}
                                keyboardType="numeric"
                                value={price}
                                onChangeText={formatPrice}
                            />
                            <Text style={styles.suffix}>€</Text>
                        </View>

                        <Text style={styles.label}>Negociabil</Text>
                        <View style={styles.segmentedContainer}>
                            <Pressable 
                                style={[styles.segmentButton, negotiable === false && styles.segmentActive]}
                                onPress={() => setNegotiable(false)}
                            >
                                <Text style={[styles.segmentText, negotiable === false && styles.segmentTextActive]}>Nu</Text>
                            </Pressable>
                            <Pressable 
                                style={[styles.segmentButton, negotiable === true && styles.segmentActive]}
                                onPress={() => setNegotiable(true)}
                            >
                                <Text style={[styles.segmentText, negotiable === true && styles.segmentTextActive]}>Da</Text>
                            </Pressable>
                        </View>

                        <Text style={styles.label}>Kilometraj</Text>
                        <View style={styles.inputSelector}>
                            <TextInput 
                                style={styles.inputText}
                                placeholder="Ex: 150.000"
                                placeholderTextColor={COLORS.placeholder}
                                keyboardType="numeric"
                                value={mileage}
                                onChangeText={formatMileage}
                            />
                            <Text style={styles.suffix}>km</Text>
                        </View>

                        <Text style={styles.label}>Anul Fabricației</Text>
                        <Pressable style={styles.inputSelector} onPress={() => openModal('year')}>
                            <Text style={[styles.inputText, !selectedYear && styles.placeholderText]}>
                                {selectedYear ? selectedYear.name : "Selectează anul..."}
                            </Text>
                            <Text style={styles.chevron}>▼</Text>
                        </Pressable>

                        <Text style={styles.label}>Serie Șasiu (VIN)</Text>
                        <View style={styles.inputSelector}>
                            <TextInput 
                                style={styles.inputText}
                                placeholder="Opțional"
                                placeholderTextColor={COLORS.placeholder}
                                autoCapitalize="characters"
                                value={vin}
                                onChangeText={(text) => setVin(text.toUpperCase())}
                                maxLength={17}
                            />
                        </View>

                        <Text style={styles.label}>Județ</Text>
                        <Pressable style={styles.inputSelector} onPress={() => openModal('county')}>
                            <Text style={[styles.inputText, !selectedCounty && styles.placeholderText]}>
                                {selectedCounty ? selectedCounty.name : "Selectează județul..."}
                            </Text>
                            <Text style={styles.chevron}>▼</Text>
                        </Pressable>

                        <Text style={styles.label}>Oraș</Text>
                        <Pressable 
                            style={[styles.inputSelector, !selectedCounty && styles.disabledInput]} 
                            onPress={() => openModal('city')}
                        >
                            <Text style={[styles.inputText, !selectedCity && styles.placeholderText]}>
                                {selectedCity ? selectedCity.name : "Selectează orașul..."}
                            </Text>
                            <Text style={styles.chevron}>▼</Text>
                        </Pressable>

                        <Text style={styles.label}>Caroserie</Text>
                        <Pressable style={styles.inputSelector} onPress={() => openModal('body')}>
                            <Text style={[styles.inputText, !selectedBody && styles.placeholderText]}>
                                {selectedBody ? selectedBody.name : "Selectează caroseria..."}
                            </Text>
                            <Text style={styles.chevron}>▼</Text>
                        </Pressable>

                        <Text style={styles.label}>Culoare</Text>
                        <Pressable style={styles.inputSelector} onPress={() => openModal('color')}>
                            <Text style={[styles.inputText, !selectedColor && styles.placeholderText]}>
                                {selectedColor ? selectedColor.name : "Selectează culoarea..."}
                            </Text>
                            <Text style={styles.chevron}>▼</Text>
                        </Pressable>

                        <Text style={styles.label}>Cutie de viteze</Text>
                        <Pressable style={styles.inputSelector} onPress={() => openModal('transmission')}>
                            <Text style={[styles.inputText, !selectedTransmission && styles.placeholderText]}>
                                {selectedTransmission ? selectedTransmission.name : "Selectează cutia..."}
                            </Text>
                            <Text style={styles.chevron}>▼</Text>
                        </Pressable>

                        <Text style={styles.label}>Tracțiune</Text>
                        <Pressable style={styles.inputSelector} onPress={() => openModal('drivetrain')}>
                            <Text style={[styles.inputText, !selectedDrivetrain && styles.placeholderText]}>
                                {selectedDrivetrain ? selectedDrivetrain.name : "Selectează tracțiunea..."}
                            </Text>
                            <Text style={styles.chevron}>▼</Text>
                        </Pressable>

                        <Text style={styles.label}>Norma de Poluare</Text>
                        <Pressable style={styles.inputSelector} onPress={() => openModal('pollution')}>
                            <Text style={[styles.inputText, !selectedPollution && styles.placeholderText]}>
                                {selectedPollution ? selectedPollution.name : "Selectează norma..."}
                            </Text>
                            <Text style={styles.chevron}>▼</Text>
                        </Pressable>

                        <Text style={styles.label}>Volan</Text>
                        <View style={styles.segmentedContainer}>
                            <Pressable 
                                style={[styles.segmentButton, steeringWheel === 'left' && styles.segmentActive]}
                                onPress={() => setSteeringWheel('left')}
                            >
                                <Text style={[styles.segmentText, steeringWheel === 'left' && styles.segmentTextActive]}>Stânga</Text>
                            </Pressable>
                            <Pressable 
                                style={[styles.segmentButton, steeringWheel === 'right' && styles.segmentActive]}
                                onPress={() => setSteeringWheel('right')}
                            >
                                <Text style={[styles.segmentText, steeringWheel === 'right' && styles.segmentTextActive]}>Dreapta</Text>
                            </Pressable>
                        </View>

                        <Text style={styles.label}>Stare Înmatriculare</Text>
                        <View style={styles.segmentedContainer}>
                            <Pressable 
                                style={[styles.segmentButton, selectedRegistration === 'registered' && styles.segmentActive]}
                                onPress={() => setSelectedRegistration('registered')}
                            >
                                <Text style={[styles.segmentText, selectedRegistration === 'registered' && styles.segmentTextActive]}>Înmatriculat</Text>
                            </Pressable>
                            <Pressable 
                                style={[styles.segmentButton, selectedRegistration === 'unregistered' && styles.segmentActive]}
                                onPress={() => setSelectedRegistration('unregistered')}
                            >
                                <Text style={[styles.segmentText, selectedRegistration === 'unregistered' && styles.segmentTextActive]}>Neînmatriculat</Text>
                            </Pressable>
                        </View>

                        <Text style={styles.label}>Acceptă schimburi</Text>
                        <View style={styles.segmentedContainer}>
                            <Pressable 
                                style={[styles.segmentButton, selectedExchange === false && styles.segmentActive]}
                                onPress={() => setSelectedExchange(false)}
                            >
                                <Text style={[styles.segmentText, selectedExchange === false && styles.segmentTextActive]}>Nu</Text>
                            </Pressable>
                            <Pressable 
                                style={[styles.segmentButton, selectedExchange === true && styles.segmentActive]}
                                onPress={() => setSelectedExchange(true)}
                            >
                                <Text style={[styles.segmentText, selectedExchange === true && styles.segmentTextActive]}>Da</Text>
                            </Pressable>
                        </View>

                        <Text style={styles.label}>Pentru dezmembrare</Text>
                        <View style={styles.segmentedContainer}>
                            <Pressable 
                                style={[styles.segmentButton, selectedDismantle === false && styles.segmentActive]}
                                onPress={() => setSelectedDismantle(false)}
                            >
                                <Text style={[styles.segmentText, selectedDismantle === false && styles.segmentTextActive]}>Nu</Text>
                            </Pressable>
                            <Pressable 
                                style={[styles.segmentButton, selectedDismantle === true && styles.segmentActive]}
                                onPress={() => setSelectedDismantle(true)}
                            >
                                <Text style={[styles.segmentText, selectedDismantle === true && styles.segmentTextActive]}>Da</Text>
                            </Pressable>
                        </View>

                        <Text style={styles.label}>Număr de telefon</Text>
                        <View style={styles.inputSelector}>
                            <TextInput 
                                style={styles.inputText}
                                placeholder="Ex: 07xxxxxxxx"
                                placeholderTextColor={COLORS.placeholder}
                                keyboardType="phone-pad"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                maxLength={10}
                            />
                        </View>

                        <Text style={styles.label}>Descriere Anunț</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Spune-ne mai multe despre mașina ta..."
                            placeholderTextColor={COLORS.placeholder}
                            multiline={true}
                            numberOfLines={4}
                            maxLength={700}
                            value={description}
                            onChangeText={setDescription}
                        />

                        <Pressable 
                            style={styles.checkboxContainer} 
                            onPress={() => setDisableComments(!disableComments)}
                        >
                            <View style={[styles.checkbox, disableComments && styles.checkboxActive]}>
                                {disableComments && <Text style={styles.checkmark}>✓</Text>}
                            </View>
                            <Text style={styles.checkboxLabel}>Oprește comentariile</Text>
                        </Pressable>

                    </View>

                    <Pressable 
                        style={styles.publishButton} 
                        onPress={handleNavigateToPreview}
                    >
                        <Text style={styles.publishButtonText}>PREVIZUALIZARE</Text>
                    </Pressable>
                    
                    <View style={{height: 50}} /> 
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {getModalTitle()}
                            </Text>
                            <Pressable onPress={() => setModalVisible(false)}>
                                <Text style={styles.closeButton}>Închide</Text>
                            </Pressable>
                        </View>

                        <TextInput 
                            style={styles.searchInput}
                            placeholder="Caută..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />

                        {isLoading() ? (
                            <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 20}} />
                        ) : (
                            <FlatList
                                data={getFilteredData()}
                                keyExtractor={(item) => item.id ? item.id.toString() : Math.random().toString()}
                                renderItem={({ item }) => (
                                    <Pressable style={styles.listItem} onPress={() => handleSelect(item)}>
                                        {currentSelectionType === 'brand' && item.logo ? (
                                            <Image source={{ uri: item.logo }} style={styles.brandLogoList} />
                                        ) : null}
                                        <View style={{flex: 1}}>
                                            <Text style={styles.listItemText}>{item.name}</Text>
                                        </View>
                                    </Pressable>
                                )}
                                ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20, color: '#999'}}>Nu am găsit rezultate.</Text>}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        alignItems: 'center'
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    scrollContent: {
        padding: 20,
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.secondary,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    mediaRow: {
        flexDirection: 'row',
    },
    addMediaButton: {
        width: 100,
        height: 100,
        backgroundColor: '#EAEAEA',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#CCC',
        borderStyle: 'dashed'
    },
    plusSign: {
        fontSize: 30,
        color: '#888',
    },
    addText: {
        fontSize: 12,
        color: '#888',
        fontWeight: '600'
    },
    mediaItem: {
        width: 100,
        height: 100,
        borderRadius: 12,
        marginRight: 10,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    mediaImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    videoBadge: {
        position: 'absolute',
        bottom: 5,
        left: 5,
        backgroundColor: 'rgba(255,0,0,0.8)',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 4,
    },
    deleteButton: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    formContainer: {
        backgroundColor: COLORS.white,
        padding: 20,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.secondary,
        marginBottom: 8,
        marginTop: 17,
        marginLeft: 2,
    },
    inputSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9F9F9',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        height: 55,
        paddingHorizontal: 15,
    },
    segmentedContainer: {
        flexDirection: 'row',
        height: 55,
        justifyContent: 'space-between',
        marginTop: 2,
    },
    segmentButton: {
        flex: 0.48,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.white,
    },
    segmentActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    segmentText: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500',
    },
    segmentTextActive: {
        color: COLORS.white,
    },
    disabledInput: {
        opacity: 0.6,
        backgroundColor: '#F0F0F0',
    },
    readOnlyInput: {
        backgroundColor: COLORS.disabled, 
        borderColor: '#E0E0E0',
    },
    inputText: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
    },
    placeholderText: {
        color: COLORS.placeholder,
    },
    suffix: {
        fontSize: 16,
        color: '#888',
        marginLeft: 10,
    },
    hpText: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    brandLogoSmall: {
        width: 30,
        height: 30,
        resizeMode: 'contain',
        marginRight: 10,
    },
    chevron: {
        fontSize: 12,
        color: '#888',
        marginLeft: 10,
    },
    textArea: {
        backgroundColor: '#F9F9F9',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        color: COLORS.text,
        textAlignVertical: 'top',
        minHeight: 100,
    },
    discountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
    },
    discountInput: {
        flex: 1,
        marginRight: 10,
        height: 50,
    },
    applyButton: {
        backgroundColor: COLORS.secondary,
        height: 50,
        paddingHorizontal: 20,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyButtonText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: 'bold',
    },
    discountStatusText: {
        fontSize: 13,
        marginTop: 5,
        marginLeft: 5,
        fontWeight: '500',
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 25,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.secondary,
    },
    totalPriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    oldPrice: {
        fontSize: 14,
        color: '#999',
        textDecorationLine: 'line-through',
        marginRight: 8,
    },
    finalPrice: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    lunarText: {
        fontSize: 14,
        color: '#888',
        marginLeft: 4,
    },
    publishButton: {
        marginTop: 30,
        backgroundColor: COLORS.secondary,
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    publishButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        height: '80%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.secondary,
    },
    closeButton: {
        fontSize: 16,
        color: COLORS.primary,
        fontWeight: '600',
    },
    searchInput: {
        backgroundColor: '#F0F0F0',
        height: 50,
        borderRadius: 10,
        paddingHorizontal: 15,
        fontSize: 16,
        marginBottom: 15,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    brandLogoList: {
        width: 40,
        height: 40,
        resizeMode: 'contain',
        marginRight: 15,
    },
    listItemText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    subText: {
        fontSize: 13,
        color: '#777',
        marginTop: 3,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
        marginBottom: 5,
        marginLeft: 2,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: COLORS.border,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        marginRight: 10,
    },
    checkboxActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    checkmark: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: Platform.OS === 'ios' ? -2 : -3, 
    },
    checkboxLabel: {
        fontSize: 15,
        color: COLORS.secondary,
        fontWeight: '500',
    },
});