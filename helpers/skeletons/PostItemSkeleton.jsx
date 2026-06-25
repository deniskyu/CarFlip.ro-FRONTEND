import React from 'react';
import { View, StyleSheet, Platform , ActivityIndicator} from 'react-native';
import Shimmer from './Shimmer.jsx';
import { scaled } from '../../screens/Main/components/PostItem.jsx';
import { UI_SCALE } from '../layout.js';

const sc = UI_SCALE;

const SKEL_BASE = 'rgba(255, 255, 255, 0.14)';
const SKEL_HIGH = 'rgba(255, 255, 255, 0.42)';

export default function PostItemSkeleton() {
    const topOffset = Platform.OS === 'ios' ? 120 : 108;

    return (
        <View style={styles.root} pointerEvents="none">
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Shimmer width={20} height={20} borderRadius={5} baseColor={SKEL_BASE} highlightColor={SKEL_HIGH} style={{ marginRight: 15 }} />
                    <View style={styles.searchTextContainer}>
                        <Shimmer width={'68%'} height={13} borderRadius={5} baseColor={SKEL_BASE} highlightColor={SKEL_HIGH} style={{ marginBottom: 6 }} />
                        <Shimmer width={'44%'} height={10} borderRadius={4} baseColor={SKEL_BASE} highlightColor={SKEL_HIGH} />
                    </View>
                    <Shimmer width={34} height={34} borderRadius={8} baseColor={SKEL_BASE} highlightColor={SKEL_HIGH} style={{ marginLeft: 10 }} />
                </View>
            </View>

            <View style={[styles.msgButton, { top: topOffset }]}>
                <Shimmer
                    width={scaled.msgBtnPadH * 2 + Math.round(78 * sc)}
                    height={scaled.msgBtnPadV * 2 + Math.round(scaled.msgBtnFont * 1.3)}
                    borderRadius={scaled.msgBtnRadius}
                    baseColor={SKEL_BASE}
                    highlightColor={SKEL_HIGH}
                />
            </View>

            <View style={[styles.rightActions, { bottom: scaled.rightActionsBottom }]}>
                <View style={[styles.profileBorder, { borderRadius: scaled.profileBorderRadius, marginBottom: scaled.actionMargin }]}>
                    <Shimmer
                        width={scaled.profileSize}
                        height={scaled.profileSize}
                        borderRadius={scaled.profileRadius}
                        baseColor={SKEL_BASE}
                        highlightColor={SKEL_HIGH}
                    />
                </View>

                {[0, 1, 2, 3, 4].map((i) => (
                    <View key={i} style={[styles.actionButton, { marginBottom: scaled.actionMargin }]}>
                        <Shimmer
                            width={scaled.iconSize}
                            height={scaled.iconSize}
                            borderRadius={Math.round(scaled.iconSize * 0.3)}
                            baseColor={SKEL_BASE}
                            highlightColor={SKEL_HIGH}
                            style={{ marginBottom: 5 }}
                        />
                        <Shimmer
                            width={Math.round(scaled.iconSize * 0.72)}
                            height={Math.round(scaled.actionFont)}
                            borderRadius={4}
                            baseColor={SKEL_BASE}
                            highlightColor={SKEL_HIGH}
                        />
                    </View>
                ))}
            </View>

            <View style={[styles.bottomOverlay, { bottom: scaled.bottomOverlayBottom }]}>
                <View style={styles.userInfoRow}>
                    <Shimmer width={Math.round(120 * sc)} height={Math.round(scaled.userNameFont)} borderRadius={5} baseColor={SKEL_BASE} highlightColor={SKEL_HIGH} style={{ marginRight: 8 }} />
                    <Shimmer width={Math.round(64 * sc)} height={Math.round(scaled.locationFont)} borderRadius={5} baseColor={SKEL_BASE} highlightColor={SKEL_HIGH} />
                </View>

                <Shimmer width={'72%'} height={Math.round(scaled.brandFont)} borderRadius={5} baseColor={SKEL_BASE} highlightColor={SKEL_HIGH} style={{ marginVertical: 6 }} />

                <Shimmer width={Math.round(95 * sc)} height={Math.round(scaled.priceFont)} borderRadius={5} baseColor={SKEL_BASE} highlightColor={SKEL_HIGH} style={{ marginBottom: 10 }} />

                <View style={[styles.tagsRow, { marginBottom: scaled.tagsRowMargin }]}>
                    {[44, 60, 46, 40].map((w, i) => (
                        <Shimmer
                            key={i}
                            width={Math.round(w * sc)}
                            height={Math.round(scaled.tagFont + scaled.tagPadV * 2)}
                            borderRadius={4}
                            baseColor={SKEL_BASE}
                            highlightColor={SKEL_HIGH}
                            style={{ marginRight: 5 }}
                        />
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#000',
    },
    searchContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 55,
        borderRadius: 12,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    searchTextContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    msgButton: {
        position: 'absolute',
        left: 15,
        zIndex: 10,
    },
    rightActions: {
        position: 'absolute',
        right: 10,
        alignItems: 'center',
        zIndex: 10,
    },
    profileBorder: {
        borderWidth: 2,
        borderColor: 'white',
        padding: 1,
    },
    actionButton: {
        alignItems: 'center',
    },
    bottomOverlay: {
        position: 'absolute',
        left: 14,
        width: '80%',
        zIndex: 5,
    },
    userInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    tagsRow: {
        flexDirection: 'row',
    },
});