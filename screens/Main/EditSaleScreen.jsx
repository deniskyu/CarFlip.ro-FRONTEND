import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
    View, 
    StyleSheet, 
    SafeAreaView, 
    ScrollView, 
    Pressable, 
    Modal, 
    FlatList, 
    Alert, 
    Platform,
    KeyboardAvoidingView,
    ActivityIndicator,
    Image
} from 'react-native';
import {Text, TextInput} from '../../helpers/AppText.jsx';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { launchImageLibrary } from 'react-native-image-picker';
import { Context } from '../../context/Context.js';

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

import { LOCATIONS } from './staticData.js';
import { normalizeMediaUri } from '../../helpers/normalizeMediaUri.js';

const ENGINE_CAPACITIES = [
    { id: 'electric', name: 'Fără (Electric)' }
];
for (let i = 6; i <= 74; i++) {
    const val = (i / 10).toFixed(1);
    ENGINE_CAPACITIES.push({ id: val, name: `${val} L` });
}

export default function EditSaleScreen({ route, navigation }) {
    const { setDraftSale } = useContext(Context); 
    const { post } = route.params;

    const initialCapacity = ENGINE_CAPACITIES.find(c => c.name === post.engine?.capacity) || { name: post.engine?.capacity };
    const [selectedCapacity, setSelectedCapacity] = useState(initialCapacity);
    const [horsepower, setHorsepower] = useState(post.horsepower ? String(post.horsepower) : '');
    const [price, setPrice] = useState(new Intl.NumberFormat('de-DE').format(post.price || 0));
    const [mileage, setMileage] = useState(new Intl.NumberFormat('de-DE').format(post.mileage || 0));
    const [vin, setVin] = useState(post.vin || '');
    const [negotiable, setNegotiable] = useState(post.negotiable || false);
    const [title, setTitle] = useState(post.title || '');
    
    const [selectedCounty, setSelectedCounty] = useState(null);
    const [selectedCity, setSelectedCity] = useState(null);
    const [countiesList, setCountiesList] = useState([]);
    const [citiesList, setCitiesList] = useState([]);

    const [selectedRegistration, setSelectedRegistration] = useState(post.registration_status || 'registered');
    const [selectedExchange, setSelectedExchange] = useState(post.exchange_accepted || false);
    const [selectedDismantle, setSelectedDismantle] = useState(post.for_dismante || false);
    const [disableComments, setDisableComments] = useState(post.allow_comments === false);

    const [phoneNumber, setPhoneNumber] = useState(post.phone_number || ''); 
    const [description, setDescription] = useState(post.description || '');

    const [newLocalMedia, setNewLocalMedia] = useState([]);
    const [loadingMedia, setLoadingMedia] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [currentSelectionType, setCurrentSelectionType] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [scrollEnabled, setScrollEnabled] = useState(true);

    useEffect(() => {
        const formattedCounties = LOCATIONS.map(item => ({
            id: item.judet,
            name: item.judet,
            cities: item.orase
        }));
        setCountiesList(formattedCounties);

        if (post.location && post.location.county) {
            const currentCounty = formattedCounties.find(c => c.name === post.location.county);
            if (currentCounty) {
                setSelectedCounty(currentCounty);
                setCitiesList(currentCounty.cities.map(city => ({ id: city, name: city })));
                setSelectedCity({ id: post.location.city, name: post.location.city });
            }
        }
    }, [post]);

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

    const isPickingRef = useRef(false);
    const scrollViewRef = useRef(null);

    const handlePickNewMedia = async () => {
        if (isPickingRef.current) return;
    
        isPickingRef.current = true;
        setLoadingMedia(true); 
    
        const options = {
            mediaType: 'mixed',
            selectionLimit: 13,
            videoQuality: 'high',
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.8,
        };
    
        try {
            const result = await launchImageLibrary(options);
    
            if (result.didCancel || result.errorCode) {
                return;
            }
    
            if (result.assets) {
                const newFiles = result.assets;
                let currentMedia = [];
                let videoCount = 0;

                const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
                const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
    
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
                        if (videoCount >= 1) {
                            Alert.alert("Info", "Poți avea maxim 1 videoclip.");
                            continue;
                        }
                        if (file.duration && file.duration > 45) {
                            Alert.alert("Video prea lung", "Videoclipul trebuie să aibă maxim 45 secunde.");
                            continue;
                        }
                        videoCount++;
                    }
                    if (currentMedia.length < 13) {
                        const normalized = await normalizeMediaUri(file);
                        if (normalized) {
                            currentMedia.push(normalized);
                        } else {
                            Alert.alert('Eroare', `Fișierul "${file.fileName || 'fișier'}" nu a putut fi procesat.`);
                        }
                    }
                }
                setNewLocalMedia(currentMedia);
            }
        } catch (error) {
            console.log("Picker error:", error);
        } finally {
            isPickingRef.current = false;
            setLoadingMedia(false);
        }
    };

    const removeNewMedia = (index) => {
        const updated = [...newLocalMedia];
        updated.splice(index, 1);
        setNewLocalMedia(updated);
    };

    const openModal = (type) => {
        if (type === 'city' && !selectedCounty) {
            Alert.alert("Atenție", "Alege întâi Județul.");
            return;
        }
        setCurrentSelectionType(type);
        setSearchQuery('');
        setModalVisible(true);
    };

    const handleSelect = (item) => {
        if (currentSelectionType === 'county') {
            setSelectedCounty(item);
            setSelectedCity(null);
            setCitiesList(item.cities.map(city => ({ id: city, name: city })));
        } else if (currentSelectionType === 'city') {
            setSelectedCity(item);
        } else if (currentSelectionType === 'capacity') {
            setSelectedCapacity(item);
        }
        setModalVisible(false);
    };

    const getFilteredData = () => {
        let data = [];
        if (currentSelectionType === 'county') data = countiesList;
        else if (currentSelectionType === 'city') data = citiesList;
        else if (currentSelectionType === 'capacity') data = ENGINE_CAPACITIES;

        if (!searchQuery) return data;
        return data.filter(item => 
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    const handleNavigateToPreview = () => {
        if (!price || !mileage || !phoneNumber || !selectedCounty || !selectedCity) {
            Alert.alert("Eroare", "Te rugăm să completezi câmpurile obligatorii.");
            return;
        }

        if (newLocalMedia.length > 0) {
            const hasPhoto = newLocalMedia.some(f => f.type && f.type.includes('image'));
            if (!hasPhoto) {
                Alert.alert("Eroare", "Trebuie să incluzi cel puțin o FOTOGRAFIE (videoclipurile sunt opționale).");
                return;
            }
        }

        const safeMedia = post.media.map(item => ({
            ...item,
            uri: item.url || item.uri,
            type: item.type || 'image/jpeg'
        }));

        const previewMedia = newLocalMedia.length > 0
            ? newLocalMedia.map(file => ({
                uri: file.uri,
                type: file.type || 'image/jpeg',
                zoom_level: 1,
                public_id: null,
                url: null,
                width: file.width,
                height: file.height
            }))
            : safeMedia;

        const newCapacity = selectedCapacity ? selectedCapacity.name : post.engine?.capacity;

        const draftData = {
            ...post, 
            engine: { ...(post.engine || {}), capacity: newCapacity },
            engine_capacity: newCapacity, 
            horsepower: horsepower,
            media: previewMedia,
            price: Number(String(price).replace(/\./g, '')),
            mileage: Number(String(mileage).replace(/\./g, '')),
            vin: vin,
            negotiable: negotiable,
            location: { county: selectedCounty.name, city: selectedCity.name },
            registration_status: selectedRegistration,
            exchange_accepted: selectedExchange,
            for_dismante: selectedDismantle,
            phone_number: phoneNumber,
            description: description,
            allow_comments: !disableComments, 
            isEditMode: true,
            editPostId: post._id,
            newLocalMedia: newLocalMedia,
            oldMediaPublicIds: post.media.map(m => m.public_id).filter(Boolean),
            title: title.trim(),
        };

        setDraftSale(draftData);
        navigation.navigate('PreviewEditSaleScreen');
    };

    const firstImageIndex = newLocalMedia.findIndex(f => f.type && f.type.includes('image'));

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={15}>
                    <Text style={styles.backText}>✕</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Editează Anunțul</Text>
                <View style={{width: 30}} />
            </View>

            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            >
                <ScrollView 
                    ref={scrollViewRef}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    scrollEnabled={scrollEnabled}
                >
                    
                    <View style={styles.infoCard}>
                        <Text style={styles.infoCardTitle}>
                            {post.brand?.name} {post.model?.name} ({post.production_year})
                        </Text>
                        <Text style={styles.infoNote}>* Aceste detalii principale nu pot fi modificate.</Text>
                    </View>

                    <Pressable
                        style={styles.changeMediaButton}
                        onPress={handlePickNewMedia}
                        disabled={loadingMedia}
                    >
                        {loadingMedia ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                            <Text style={styles.changeMediaButtonText}>
                                {newLocalMedia.length > 0
                                    ? `✓ ${newLocalMedia.length} fișiere noi selectate — apasă pentru a schimba`
                                    : '🖼  Schimbă elementele media'}
                            </Text>
                        )}
                    </Pressable>

                    {newLocalMedia.length > 0 && (
                        <View style={styles.newMediaSection}>
                            <Text style={styles.newMediaNote}>
                                Aceste fișiere vor înlocui complet pozele/videoclipurile actuale după salvare. După schimbare, va dura câteva minute ca anunțul să fie procesat.
                            </Text>
                            <View style={styles.mediaRow}>
                                <DraggableFlatList
                                    data={newLocalMedia}
                                    horizontal={true}
                                    containerStyle={{ flex: 1 }}
                                    ListFooterComponent={<View style={{ width: 20 }} />}
                                    onDragBegin={() => setScrollEnabled(false)}
                                    onDragEnd={({ data }) => {
                                        setNewLocalMedia(data);
                                        setScrollEnabled(true);
                                    }}
                                    keyExtractor={(item) => item.uri}
                                    showsHorizontalScrollIndicator={false}
                                    renderItem={({ item, getIndex, drag, isActive }) => {
                                        const index = getIndex();
                                        return (
                                            <ScaleDecorator activeScale={0.95}>
                                                <Pressable
                                                    onLongPress={drag}
                                                    delayLongPress={150}
                                                    style={[
                                                        styles.mediaItemOuter,
                                                        isActive && styles.mediaItemActive,
                                                        index === firstImageIndex && styles.mediaItemFirst,
                                                    ]}
                                                >
                                                    <View style={styles.mediaItemInner}>
                                                        <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                                                        {item.type && item.type.includes('video') && (
                                                            <View style={styles.videoBadge}>
                                                                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>VIDEO</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    {index === firstImageIndex && (
                                                        <View style={styles.coverBadge}>
                                                            <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>COPERTĂ</Text>
                                                        </View>
                                                    )}
                                                    <Pressable
                                                        style={styles.deleteButton}
                                                        onPress={() => removeNewMedia(index)}
                                                        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                                                    >
                                                        <Text style={styles.deleteText}>X</Text>
                                                    </Pressable>
                                                </Pressable>
                                            </ScaleDecorator>
                                        );
                                    }}
                                />
                            </View>
                        </View>
                    )}

                    <View style={styles.formContainer}>

                        <Text style={styles.label}>Titlu Anunț (max 35 caractere)</Text>
                        <View style={styles.inputSelector}>
                            <TextInput 
                                style={styles.inputText}
                                placeholder="Ex: BMW 320d M-Pachet 2020"
                                placeholderTextColor={COLORS.placeholder}
                                value={title}
                                onChangeText={setTitle}
                                maxLength={35}
                            />
                        </View>

                        <Text style={styles.label}>Capacitate Motor</Text>
                        <Pressable style={styles.inputSelector} onPress={() => openModal('capacity')}>
                            <Text style={[styles.inputText, !selectedCapacity && styles.placeholderText]}>
                                {selectedCapacity && selectedCapacity.name ? selectedCapacity.name : "Selectează capacitatea..."}
                            </Text>
                            <Text style={styles.chevron}>▼</Text>
                        </Pressable>

                        <Text style={styles.label}>Cai Putere (opțional)</Text>
                        <View style={styles.inputSelector}>
                            <TextInput 
                                style={styles.inputText}
                                placeholder="Ex: 150"
                                placeholderTextColor={COLORS.placeholder}
                                keyboardType="numeric"
                                value={horsepower}
                                onChangeText={(text) => setHorsepower(text.replace(/[^0-9]/g, ''))}
                                maxLength={4}
                            />
                            <Text style={styles.suffix}>CP</Text>
                        </View>

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

                        <Text style={styles.label}>Descriere Anunț (1000 caractere)</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Spune-ne mai multe despre mașina ta..."
                            placeholderTextColor={COLORS.placeholder}
                            multiline={true}
                            numberOfLines={4}
                            maxLength={1000}
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
                    <View style={{height: 70}} />
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
                                {currentSelectionType === 'county' ? 'Alege Județul' : currentSelectionType === 'city' ? 'Alege Orașul' : 'Alege Capacitatea'}
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

                        <FlatList
                            data={getFilteredData()}
                            keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                            renderItem={({ item }) => (
                                <Pressable style={styles.listItem} onPress={() => handleSelect(item)}>
                                    <View style={{flex: 1}}>
                                        <Text style={styles.listItemText}>{item.name}</Text>
                                    </View>
                                </Pressable>
                            )}
                            ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20, color: '#999'}}>Nu am găsit rezultate.</Text>}
                        />
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    backButton: {
        width: 30,
        height: 30,
        justifyContent: 'center',
    },
    backText: {
        fontSize: 22,
        color: COLORS.secondary,
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.secondary,
    },
    scrollContent: {
        padding: 20,
    },
    infoCard: {
        backgroundColor: '#e6f2ff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.secondary,
    },
    infoCardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.secondary,
        marginBottom: 4,
    },
    infoNote: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
    },
    changeMediaButton: {
        backgroundColor: COLORS.secondary,
        height: 55,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    changeMediaButtonText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center'
    },
    newMediaSection: {
        marginBottom: 20,
    },
    newMediaNote: {
        fontSize: 12,
        color: '#888',
        fontStyle: 'italic',
        marginBottom: 10,
        marginLeft: 2,
    },
    mediaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: Platform.OS === 'ios' ? 110 : 100,
    },
    mediaItemOuter: {
        width: Platform.OS === 'ios' ? 100 : 90,
        height: Platform.OS === 'ios' ? 100 : 90,
        borderRadius: 12,
        marginRight: 10,
        backgroundColor: '#000',
    },
    mediaItemInner: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    mediaItemActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 10,
    },
    mediaItemFirst: {
        borderWidth: 2.5,
        borderColor: COLORS.primary,
        borderRadius: 12,
    },
    coverBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
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
        textAlign: 'center',
        lineHeight: 16,
        includeFontPadding: false,
    },
    checkboxLabel: {
        fontSize: 15,
        color: COLORS.secondary,
        fontWeight: '500',
    },
    publishButton: {
        marginTop: 30,
        backgroundColor: COLORS.secondary,
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.secondary,
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
    listItemText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    prepOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#fefefe',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
    },
    prepText: {
        marginTop: 14,
        fontSize: 16,
        color: COLORS.primary,
        fontWeight: '600',
    }
});
