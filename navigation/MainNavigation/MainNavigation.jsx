import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack'; 
import { Image, Platform, View } from 'react-native';
import { assets } from '../../assets.js';
import { Context } from '../../context/Context.js';
import { emitter } from '../../helpers/eventBus.js';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';

import {Text, TextInput} from '../../helpers/AppText.jsx';

import MainScreen from '../../screens/Main/MainScreen.jsx';
import ProfileScreen from '../../screens/Main/ProfileScreen.jsx';
import NotificationScreen from '../../screens/Main/NotificationScreen.jsx';
import AddSaleScreen from '../../screens/Main/AddSaleScreen.jsx';
import SearchResultScreen from '../../screens/Main/SearchResultScreen.jsx';
import SearchProfileResult from '../../screens/Main/SearchProfileResult.jsx';
import UserProfileFeed from '../../screens/Main/UserProfileFeed.jsx';
import LikedPostsFeed from '../../screens/Main/LikedPostsFeed.jsx';
import ActivePostsFeed from '../../screens/Main/ActivePostsFeed.jsx';
import PreviewSaleScreen from '../../screens/Main/PreviewSaleScreen.jsx';
import EditSaleScreen from '../../screens/Main/EditSaleScreen.jsx';
import PreviewEditSaleScreen from '../../screens/Main/PreviewEditSaleScreen.jsx';

import ChatListScreen from '../../screens/Main/ChatListScreen.jsx';
import ChatScreen from '../../screens/Main/ChatScreen.jsx';

import SecurityScreen from '../../screens/Main/SecurityScreen.jsx';
import ContactScreen from '../../screens/Main/ContactScreen.jsx';
import PrivacyScreen from '../../screens/Main/PrivacyScreen.jsx';
import LegalScreen from '../../screens/Main/LegalScreen.jsx';

import SinglePostScreen from '../../screens/Main/SinglePostScreen.jsx';
import SearchListScreen from '../../screens/Main/SearchListScreen.jsx';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function HomeStackNavigation() {
    return (
        <Stack.Navigator 
            screenOptions={{ 
                headerShown: false,
                animation: 'slide_from_right'
            }}
        >
            <Stack.Screen name="MainScreen" component={MainScreen} />
            <Stack.Screen name="SearchResultScreen" component={SearchResultScreen} />
            <Stack.Screen name="SearchProfileResult" component={SearchProfileResult} />
            <Stack.Screen name="SearchListScreen" component={SearchListScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SinglePostScreen" component={SinglePostScreen} options={{ headerShown: false }} />
            <Stack.Screen name="UserProfileFeed" component={UserProfileFeed} />
            <Stack.Screen name="LikedPostsFeed" component={LikedPostsFeed} />
        </Stack.Navigator>
    );
}

function CustomDrawerContent(props) {
    const { logoutContext } = useContext(Context);

    return (
        <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
            <View style={{ flex: 1, paddingTop: 10 }}>
                <DrawerItemList {...props} />
            </View>
            <View style={{ paddingBottom: 30, borderTopWidth: 0.5, borderTopColor: '#2F353E', marginTop: 4 }}>
                <DrawerItem 
                    label="Deconectare" 
                    onPress={() => logoutContext()} 
                    labelStyle={{ 
                        color: '#E0706C', 
                        fontWeight: 'bold', 
                        fontSize: 15,
                    }}
                />
            </View>
        </DrawerContentScrollView>
    );
}

function AddSaleStackNavigation() {
    return (
        <Stack.Navigator 
            screenOptions={{ 
                headerShown: false,
                animation: 'slide_from_right'
            }}
        >
            <Stack.Screen name="AddSaleForm" component={AddSaleScreen} />
            <Stack.Screen name="PreviewSaleScreen" component={PreviewSaleScreen} />
        </Stack.Navigator>
    );
}

function ChatStackNavigation() {
    return (
        <Stack.Navigator 
            screenOptions={{ 
                headerShown: false,
                animation: 'none'
            }}
        >
            <Stack.Screen name="ChatListScreen" component={ChatListScreen} />
            <Stack.Screen name="ChatScreen" component={ChatScreen} options={{ animation: 'none' }}/>
        </Stack.Navigator>
    );
}


function ProfileStackNavigation() {
    return (
        <Stack.Navigator 
            screenOptions={{ 
                headerShown: false,
                animation: 'slide_from_right'
            }}
        >
            <Stack.Screen name="ProfileDrawer" component={ProfileDrawerNavigation} />
            
            <Stack.Screen name="LikedPostsFeed" component={LikedPostsFeed} />
            <Stack.Screen name="ActivePostsFeed" component={ActivePostsFeed} />
            <Stack.Screen name="UserProfileFeed" component={UserProfileFeed} />
            <Stack.Screen name="SearchProfileResult" component={SearchProfileResult} />
            <Stack.Screen name="EditSaleScreen" component={EditSaleScreen} />
            <Stack.Screen name="PreviewEditSaleScreen" component={PreviewEditSaleScreen} />
        </Stack.Navigator>
    );
}



function ProfileDrawerNavigation() {
    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                drawerPosition: 'right', 
                headerShown: false,
                drawerStyle: {
                    width: '60%',     
                    backgroundColor: '#1B1F26',
                },
                drawerActiveTintColor: '#800000',  
                drawerActiveBackgroundColor: 'rgba(128, 0, 0, 0.08)',
                drawerInactiveTintColor: '#E6E8EB',   
                drawerLabelStyle: {
                    fontSize: 15,
                    fontWeight: '500',
                    marginLeft: -10,   
                },
                drawerItemStyle: {
                    borderBottomWidth: 0.5,   
                    borderBottomColor: '#2F353E',
                    borderRadius: 0,        
                    marginHorizontal: 0,
                    paddingVertical: 2,
                },
            }}>
            <Drawer.Screen 
                name="Profile" 
                component={ProfileScreen} 
                options={{ title: 'Profilul meu' }} 
            />
            <Drawer.Screen name="Security" component={SecurityScreen} options={{ title: 'Securitate' }} />
            <Drawer.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Confidențialitate' }} />
            <Drawer.Screen name="Legal" component={LegalScreen} options={{ title: 'Informații legale' }} />
            <Drawer.Screen name="Contact" component={ContactScreen} options={{ title: 'Contact' }} />
        </Drawer.Navigator>
    );
}

export default function MainNavigation() {

    const { unreadCount, unreadChatCount } = useContext(Context);

    
    return (
        <Tab.Navigator 
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: '#13161A',
                    borderTopWidth: 0,
                    paddingBottom: 0,
                    marginBottom: 0,
                    ...(Platform.OS === 'ios' ? { height: 80, paddingTop: 10 } : { paddingBottom: 0, paddingTop: 2 }),
                },
                tabBarIcon: ({ focused }) => {
                    let iconSource;
                    let iconSize = 24; 
                    
                    switch (route.name) {
                        case 'HomeTab': 
                            iconSource = assets.home_icon;
                            break;
                        case 'NotificationScreen':
                            iconSource = assets.bell_icon;
                            return (
                                <View>
                                    <Image 
                                        source={iconSource}
                                        style={{
                                            width: iconSize,
                                            height: iconSize,
                                            resizeMode: 'contain',
                                            tintColor: focused ? '#800000' : 'rgba(255, 255, 255, 0.5)'
                                        }}
                                    />
                                    {unreadCount > 0 && (
                                        <View style={{
                                            position: 'absolute',
                                            top: -4,
                                            right: -6,
                                            backgroundColor: '#FF3B30',
                                            borderRadius: 10,
                                            minWidth: 18,
                                            height: 18,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            paddingHorizontal: 4,
                                            borderWidth: 1.5,
                                            borderColor: '#800000'
                                        }}>
                                            <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            );
                        case 'AddSaleScreen':
                            iconSource = assets.add_icon;
                            iconSize = 38;
                            break;
                        case 'ChatTab':
                            iconSource = assets.messages_icon;
                            return (
                                <View>
                                    <Image source={iconSource} style={{ width: iconSize, height: iconSize, resizeMode: 'contain', tintColor: focused ? '#800000' : 'rgba(255, 255, 255, 0.5)' }} />
                                    {unreadChatCount > 0 && (
                                        <View style={{ position: 'absolute', top: -4, right: -6, backgroundColor: '#FF3B30', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#800000' }}>
                                            <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>
                                                {unreadChatCount > 99 ? '99+' : unreadChatCount}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            );
                        case 'ProfileTab':
                            iconSource = assets.profile_icon;
                            break;
                    }

                    return (
                        <Image 
                            source={iconSource}
                            style={{
                                width: iconSize,
                                height: iconSize,
                                resizeMode: 'contain',
                                tintColor: focused ? '#800000' : 'rgba(255, 255, 255, 0.5)'
                            }}
                        />
                    );
                }
            })}
        >
            <Tab.Screen 
                name="HomeTab" 
                component={HomeStackNavigation} 
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        const state = navigation.getState();
                        
                        if (state.routes[state.index]?.name !== 'HomeTab') {
                            return;
                        }
                        
                        const homeTabRoute = state.routes.find(r => r.name === 'HomeTab');
                        const homeStack = homeTabRoute?.state;
                        
                        if (!homeStack) {
                            emitter.emit('force_home_refresh');
                            return;
                        }
                        
                        const activeRouteName = homeStack.routes[homeStack.index]?.name;
                        
                        if (activeRouteName === 'MainScreen') {
                            emitter.emit('force_home_refresh');
                        }
                    },
                })}
            />
            <Tab.Screen name="NotificationScreen" component={NotificationScreen} />
            <Tab.Screen 
                name="AddSaleScreen" 
                component={AddSaleStackNavigation} 
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        navigation.navigate('AddSaleScreen', {
                            screen: 'AddSaleForm',
                        });
                    },
                })}
            />
            <Tab.Screen
                name="ChatTab"
                component={ChatStackNavigation}
                options={({ route }) => {
                    const routeName = getFocusedRouteNameFromRoute(route) ?? 'ChatListScreen';
                    return {
                        tabBarStyle: routeName === 'ChatScreen'
                            ? { display: 'none' }
                            : {
                                backgroundColor: '#13161A',
                                borderTopWidth: 0,
                                paddingBottom: 0,
                                marginBottom: 0,
                                ...(Platform.OS === 'ios' ? { height: 80, paddingTop: 10 } : { paddingBottom: 0, paddingTop: 2 }),
                            },
                    };
                }}
            />
            <Tab.Screen 
                name="ProfileTab" 
                component={ProfileStackNavigation} 
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        const state = navigation.getState();
                        
                        if (state.routes[state.index]?.name !== 'ProfileTab') {
                            return;
                        }
                        
                        e.preventDefault();
                        

                        navigation.navigate('ProfileTab', {
                            screen: 'ProfileDrawer',
                            params: {
                                screen: 'Profile',
                            },
                        });
                    },
                })}
            />
        </Tab.Navigator>
    );
}