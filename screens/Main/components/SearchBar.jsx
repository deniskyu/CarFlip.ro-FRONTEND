import React from 'react';
import { 
    View, 
    StyleSheet, 
    Pressable, 
    Image, 
    Platform 
} from 'react-native';
import { assets } from '../../../assets.js'; 

import {Text, TextInput} from '../../../helpers/AppText.jsx';

export default function SearchBar({ onPress }) {
    return (
        <View style={styles.container}>
            <Pressable 
                style={styles.searchBar} 
                onPress={onPress}
                activeOpacity={0.8}
            >
                <Image 
                    source={assets.search_icon} 
                    style={styles.searchIcon} 
                />

                <View style={styles.textContainer}>
                    <Text style={styles.title}>Caută mașina/profilul...</Text>
                    <Text style={styles.subtitle}>Marcă, Model, Preț, An</Text>
                </View>

                <View style={styles.filterButton}>
                    <Image 
                        source={assets.filter_icon} 
                        style={styles.filterIcon} 
                    />
                </View>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 10,
        backgroundColor: 'transparent',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.65)', 
        height: 55,
        borderRadius: 12,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    searchIcon: {
        width: 20,
        height: 20,
        tintColor: '#CCC',
        marginRight: 15,
        resizeMode: 'contain'
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: {width: -1, height: 1},
        textShadowRadius: 3
    },
    subtitle: {
        color: '#BBB',
        fontSize: 11,
        marginTop: 2,
    },
    filterButton: {
        backgroundColor: 'rgba(128, 0, 0, 0.8)',
        padding: 8,
        borderRadius: 8,
        marginLeft: 10,
        borderWidth: 1,
        borderColor: '#800000',
    },
    filterIcon: {
        width: 18,
        height: 18,
        tintColor: '#FFF',
        resizeMode: 'contain'
    }
});