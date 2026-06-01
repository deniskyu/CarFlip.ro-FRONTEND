import { SafeAreaView, Platform, Dimensions, Pressable, View, StyleSheet, StatusBar, Image } from 'react-native';

import {Text, TextInput} from '../../helpers/AppText.jsx';
import { assets } from '../../assets.js';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const wwidth = Dimensions.get('window').width;
const wheight = Dimensions.get('window').height;

export default function MainLoginScreen({navigation}){
  const insets = useSafeAreaInsets();

  return(
    <View style={styles.container}>
       <StatusBar hidden/>
       <View style={{ position: 'absolute', top: insets.top + 10, left: 24, zIndex: 10 }}>
           <Pressable onPress={() => navigation.goBack()} hitSlop={20} style={{ padding: 5 }}>
               <Image source={assets.back_arrow} style={{ width: 28, height: 28, resizeMode: 'contain', tintColor: '#081539' }} />
           </Pressable>
       </View>
       <SafeAreaView style={styles.safe}>
            
            <View style={styles.middleSection}>
                <Image 
                    source={assets.logo} 
                    style={styles.carImage} 
                    resizeMode="contain" 
                />
            </View>
            
            <View style={styles.bottomSection}>
                <View style={styles.buttonContainer}>
                <Pressable onPress = { () => navigation.navigate('LoginScreen')}>
                    <View style={styles.button}>
                    <Text style={styles.buttonText}>Intră în cont</Text>
                    </View>
                </Pressable>
                </View>
                
                <View style={styles.buttonContainer}>
                <Pressable onPress = { () => navigation.navigate('RegisterScreen')}>
                    <View style={[styles.button, {backgroundColor:'#800000'}]}>
                    <Text style={styles.buttonText}>Creează cont</Text>
                    </View>
                </Pressable>
                </View>
            </View>

       </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fefefe',
    },
    safe:{
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: wwidth/14,
    },
    topSection: {
        paddingTop: wheight/14, 
        paddingLeft: wwidth/14,
    },
    text1:{
        fontSize:wwidth/7,
        color:'#081539',
        fontWeight:'bold',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'sans-serif-medium',
    },
    text2:{
        fontSize:wwidth/4,
        color:'#CC0000',
        fontWeight:'bold',
        marginTop: -10,
    }, 
    middleSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        borderRadius: '50%',
    },
    carImage: {
        width: '55%',
        height: '55%',
    },
    bottomSection: {
        paddingBottom: wheight/20,
        alignItems: 'center',
    },
    button:{
        backgroundColor: '#081539',
        width: wwidth/1.1,
        height: wheight/14,
        borderRadius:22,
        alignSelf:'center',
        alignItems:'center',
        justifyContent:'center',
        marginTop: 15,
      },
    buttonText:{
        color: '#fff',
        fontSize:17,
        fontWeight:'bold',
    },
    buttonContainer:{
        alignItems:'center',
    },
});