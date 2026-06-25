import React from 'react';
import { View, StyleSheet } from 'react-native';
import Shimmer from './Shimmer.jsx';

const SK_BASE = '#32383F';
const SK_HIGH = '#3C424B';
const CARD = '#262B33';
const BORDER = '#2F353E';

const ROWS = [0, 1, 2];

function NotifSkeletonCard() {
    return (
        <View style={styles.notifCard}>
            <Shimmer width={46} height={46} borderRadius={23} baseColor={SK_BASE} highlightColor={SK_HIGH} style={{ marginRight: 14 }} />
            <View style={styles.content}>
                <Shimmer width={'55%'} height={14} borderRadius={5} baseColor={SK_BASE} highlightColor={SK_HIGH} style={{ marginBottom: 8 }} />
                <Shimmer width={'90%'} height={11} borderRadius={5} baseColor={SK_BASE} highlightColor={SK_HIGH} style={{ marginBottom: 5 }} />
                <Shimmer width={'62%'} height={11} borderRadius={5} baseColor={SK_BASE} highlightColor={SK_HIGH} />
            </View>
        </View>
    );
}

function AlertSkeletonCard() {
    return (
        <View style={styles.alertCard}>
            <Shimmer width={50} height={50} borderRadius={12} baseColor={SK_BASE} highlightColor={SK_HIGH} style={{ marginRight: 15 }} />
            <View style={styles.content}>
                <Shimmer width={'45%'} height={16} borderRadius={5} baseColor={SK_BASE} highlightColor={SK_HIGH} style={{ marginBottom: 8 }} />
                <Shimmer width={'90%'} height={12} borderRadius={5} baseColor={SK_BASE} highlightColor={SK_HIGH} style={{ marginBottom: 5 }} />
                <Shimmer width={'65%'} height={12} borderRadius={5} baseColor={SK_BASE} highlightColor={SK_HIGH} />
            </View>
        </View>
    );
}

export function NotificationListSkeleton() {
    return (
        <View style={styles.list} pointerEvents="none">
            {ROWS.map((i) => (
                <NotifSkeletonCard key={i} />
            ))}
        </View>
    );
}

export function AlertListSkeleton() {
    return (
        <View style={styles.list} pointerEvents="none">
            {ROWS.map((i) => (
                <AlertSkeletonCard key={i} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    list: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    notifCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CARD,
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: BORDER,
    },
    alertCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CARD,
        borderRadius: 16,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: BORDER,
    },
    content: {
        flex: 1,
    },
});